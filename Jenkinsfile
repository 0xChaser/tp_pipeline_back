pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        DOCKERHUB_CREDS = credentials('dockerhub-credentials')
        IMAGE_TAG       = "${BUILD_NUMBER}"
        IMAGE_REF       = "${DOCKERHUB_CREDS_USR}/tp_pipeline_back"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx prisma generate'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**', fingerprint: true
                }
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    publishHTML(target: [
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'coverage/lcov-report',
                        reportFiles          : 'index.html',
                        reportName           : 'Coverage Report'
                    ])
                }
            }
        }

        stage('E2E Tests') {
            steps {
                sh 'npm run test:e2e'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${IMAGE_REF}:${IMAGE_TAG} -t ${IMAGE_REF}:latest ."
            }
        }

        stage('SBOM (SPDX)') {
            steps {
                sh "trivy image --format spdx-json --output sbom-spdx.json ${IMAGE_REF}:${IMAGE_TAG}"
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom-spdx.json', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Trivy Scan') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL --exit-code 0 --format table --output trivy-report.txt ${IMAGE_REF}:${IMAGE_TAG}"
                sh 'cat trivy-report.txt'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.txt', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Docker Push') {
            steps {
                // config docker propre au workspace : deux builds simultanes
                // ne partagent pas leur session de login
                sh '''
                    export DOCKER_CONFIG="$WORKSPACE/.docker"
                    mkdir -p "$DOCKER_CONFIG"
                    echo "$DOCKERHUB_CREDS_PSW" | docker login -u "$DOCKERHUB_CREDS_USR" --password-stdin
                    docker push "$IMAGE_REF:$IMAGE_TAG"
                    docker push "$IMAGE_REF:latest"
                '''
            }
            post {
                always {
                    sh 'DOCKER_CONFIG="$WORKSPACE/.docker" docker logout || true'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Pipeline OK : image ${IMAGE_REF}:${IMAGE_TAG} publiee sur Docker Hub"
        }
        failure {
            echo 'Pipeline en echec, voir les logs ci-dessus'
        }
    }
}
