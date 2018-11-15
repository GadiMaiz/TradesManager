
def label = "mypod-${UUID.randomUUID().toString()}"
podTemplate(label: label, containers: [
    containerTemplate(
        name: 'nodejs2', 
        image: 'node:8.9.4', 
        ttyEnabled: true, 
        command: 'cat'
        )
    ]
)

{
    try {
        node(label) {
            def branch = env.BRANCH_NAME
            stage ("Checkout") {
                container('nodejs2'){
                    checkout scm
                }
            }
            stage('Install npm') {
                container('nodejs2') {
                    echo 'installing npm...'
                    sh 'npm i npm@latest -g'
                }
            }
            stage('Install dependencies') {
                container('nodejs2') {
                    echo 'installing dependencies...'
                    sh 'npm install'           
                }
            }
            stage('Test') {
                container('nodejs2') {
                    echo 'Testing..'
                    sh 'npm test'
                }
            }
            stage ("Coverage") {
                container('nodejs2'){
                    publishHTML (target: [
                    allowMissing: false,
                    alwaysLinkToLastBuild: false,
                    keepAll: true,
                    reportDir: "coverage",
                    reportFiles: "index.html",
                    reportName: "Istanbul Report"
                    ])
                }
            }
            stage('Lint') {
                container('nodejs2') {
                    echo 'Linting..'
                    sh 'npm run lint'
                }
            }
            stage ("Cleanup") {
                    currentBuild.result = "SUCCESS"
            }
        } // node
    }
    catch (err) {
        println "Something went wrong!"
        println err
        currentBuild.result = "FAILURE"
    }
    finally {
        email.send(currentBuild)
        println "Finished"
    }
}