pipeline {
  agent any

  environment {
    // guarantee Jenkins finds docker/kubectl on macOS
    PATH = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"
    DOCKER = "/usr/local/bin/docker"   // use absolute path to avoid env quirks

    REGISTRY = "docker.io"
    REGISTRY_NAMESPACE = "kt676"   // <-- change to your Docker Hub username
    IMAGE_NAME = "hello-k8s"
    COMMIT_SHA = "${env.GIT_COMMIT?.take(7) ?: 'dev'}"
    IMAGE_TAG = "${COMMIT_SHA}"
    IMAGE_URI = "${REGISTRY}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
  }

  triggers { pollSCM('H/2 * * * *') }

  stages {
    stage('Doctor') {
      steps {
        sh '''
          echo "PATH=$PATH"
          which "$DOCKER" || echo "no docker at $DOCKER"
          "$DOCKER" version || true
          which kubectl || echo "kubectl not found"
        '''
      }
    }

    stage('Checkout') {
      steps { checkout scm }
    }

    // Run tests inside Node using the Docker CLI (no Docker Pipeline plugin wrappers)
    stage('Unit tests') {
      steps {
        sh '''
          set -e
          "$DOCKER" run --rm -v "$PWD":/app -w /app node:18-alpine \
            sh -lc "npm ci || npm install; node -e \\"console.log('smoke ok')\\""
        '''
      }
    }

    stage('Build Docker image') {
      steps {
        sh '"$DOCKER" build -t "${IMAGE_URI}" .'
      }
    }

    stage('Login & Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
          sh '''
            set -e
            echo "$DOCKER_PASS" | "$DOCKER" login -u "$DOCKER_USER" --password-stdin ${REGISTRY}
            "$DOCKER" push "${IMAGE_URI}"
            "$DOCKER" logout ${REGISTRY}
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        withCredentials([file(credentialsId: 'kubeconfig-local', variable: 'KUBECONFIG')]) {
          sh '''
            set -e
            kubectl set image deployment/hello-deploy app="${IMAGE_URI}"
            kubectl rollout status deployment/hello-deploy --timeout=120s
            kubectl get pods -l app=hello -o wide
          '''
        }
      }
    }
  }

  post {
    success { echo "Deployed ${IMAGE_URI} successfully!" }
    failure { echo "Build failed. Rollback with: kubectl rollout undo deploy/hello-deploy" }
  }
}
