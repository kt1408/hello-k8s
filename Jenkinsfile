pipeline {
  agent any

  environment {
    PATH = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"
    REGISTRY = 'docker.io'
    REGISTRY_NAMESPACE = 'kt676'        // <-- change to your Docker Hub user
    IMAGE_NAME = 'hello-k8s'
    COMMIT_SHA = "${env.GIT_COMMIT?.take(7) ?: 'dev'}"
    IMAGE_TAG = "${COMMIT_SHA}"
    IMAGE_URI = "${REGISTRY}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
  }

  triggers {
    pollSCM('H/2 * * * *')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    // Run just this stage in a Node container (has npm)
    stage('Unit tests') {
      agent { docker { image 'node:18-alpine' } }
      steps {
        sh '''
          set -e
          npm ci || npm install
          node -e "console.log('smoke ok')"
        '''
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build -t "${IMAGE_URI}" .'
      }
    }

    stage('Login & Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
          sh '''
            set -e
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin ${REGISTRY}
            docker push "${IMAGE_URI}"
            docker logout ${REGISTRY}
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
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Deployed ${IMAGE_URI} successfully!"
    }
    failure {
      echo "Build failed. Rollback with: kubectl rollout undo deploy/hello-deploy"
    }
  }
}
