timeout(time: 20, uint: 'MINUTES') {
  node {
    properties([buildDiscarder(logRotator(numToKeepStr: "10"))])

    deleteDir()

    stage("Checkout") {
      checkout scm
    }

    try {
      nvm(version: "8") {
        stage("Build") {
          sh "./deployment/build.sh"

          archiveArtifacts artifacts: "*.tar.gz", fingerprint: true
        }

        def isDeployingProd = env.BRANCH_NAME == "master"
        if (isDeployingProd) {

          withCredentials([sshUserPrivateKey(
              credentialsId: "4041a521-7700-4cac-9df5-b4001f739975",
              keyFileVariable: "GITHUB_KEY"
          )]) {
            stage("Deploy") {
              sh "ansible-playbook ./deployment/site.yml -i ./deployment/hosts --extra-vars \"payments_version=${env.BUILD_NUMBER}\" --key-file $GITHUB_KEY"
            }
          }
        }
      }
    } catch (err) {
      currentBuild.result = 'FAIL'
      emailext (
          subject: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
          body: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]': Check console output at '${env.BUILD_URL}' [${env.BUILD_NUMBER}]",
          recipientProviders: [[$class: 'DevelopersRecipientProvider'], [$class: 'RequesterRecipientProvider']],
          to: "tomusdrw+jenkins@gmail.com"
      )
      throw err
    }
  }
}
