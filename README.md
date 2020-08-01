# Git-connector

Git folder or file synchronization.

Git-connector is an middleware for launch application. Before launching application, git-connector downloads files or/and folders, parsing and then git-connector watching changes.

install: `npm i git-connector -g`

show help: `git-connector -h`

usage example: `git-connector -e "node ./test_app.js" -t "https://github.com/samurayii/git-connector.git:master:/README.md:./tmp/README_pull.md" -tmp ./tmp -u -i 5 -w "http://127.0.0.1:3000/" -k ./tests/args1.json ./tests/args2.json -c ./tests`