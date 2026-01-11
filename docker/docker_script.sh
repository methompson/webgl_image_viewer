appName=webgl_image_viewer
registryUrl=con.kakomu.com

compileApp() {
  rm -rf dist
  rm -rf docker/artifacts
  mkdir -p docker/artifacts

  npm run build

  mv dist docker/artifacts
}

buildContainer() {
  compileApp
  (
    cd docker && \
    docker build -t $appName .
  )
}

runContainer() {
  (
    cd docker
    docker run \
      --rm \
      -p 3000:80 \
      --name webgl_image_viewer \
      webgl_image_viewer
  )
}

restartContainer() {
  printf "Restarting %s\n" $appName
  docker restart $appName
}

stopContainer() {
  printf "Stopping %s\n" $appName
  docker stop $appName
}

exportContainer() {
  (
    cd docker
    rm -rf dist
    mkdir dist
    docker save $appName -o ./dist/$appName.tar
  )
}

buildAMD64Container() {
  compileApp

  (
    cd docker
    docker buildx build \
      --platform=linux/amd64 \
      -t $appName .
  )
}

uploadImage() {
  docker load -i docker/dist/$appName.tar
  docker tag $appName $registryUrl/$appName
  docker push $registryUrl/$appName
}

registryLogin() {
  docker login $registryUrl --username methompson
}

showContainerLogs() {
  docker logs $appName
}

tailContainerLogs() {
  docker logs $appName --follow
}

isContainerRunning() {
  containerRunning=`docker container ls -f "name=$appName" -q | wc -l`
  return "$containerRunning"
}

getUserInput() {
  printf "\n\nThis script should be run from the root directory of the project\n\n"

  if [ $containerRunning -eq 1 ]
  then
    printf "%s is running" $appName
    containerRunningMenu
  else
    printf "%s is not running" $appName
    containerNotRunningMenu
  fi
}

containerRunningMenu() {
  printf "\n\nWhat do you want to do?\n\n"
  printf "1. Restart %s\n" $appName
  printf "2. Stop %s\n" $appName
  printf "3. Show logs of %s\n" $appName
  printf "4. Tail logs of %s\n" $appName
  printf "5. Build %s\n" $appName
  printf "6. Build and Export %s for current processor architecture\n" $appName
  printf "7. Build and Export %s for AMD64 architecture\n" $appName
  printf "8. Upload %s to registry\n" $appName
  printf "9. Build, Export, and Upload %s to registry\n" $appName
  printf "10. Login to registry\n"
  printf "Any other key exits\n"
  read -p "Select: " selection

  if [[ $selection == 1 ]]
  then
    restartContainer
  elif [[ $selection == 2 ]]
  then
    stopContainer
  elif [[ $selection == 3 ]]
  then
    showContainerLogs
  elif [[ $selection == 4 ]]
  then
    tailContainerLogs
  elif [[ $selection == 5 ]]
  then
    buildContainer
  elif [[ $selection == 6 ]]
  then
    buildContainer
    exportContainer
  elif [[ $selection == 7 ]]
  then
    buildAMD64Container
    exportContainer
  elif [[ $selection == 8 ]]
  then
    uploadImage
  elif [[ $selection == 9 ]]
  then
    buildAMD64Container
    exportContainer
    uploadImage
  elif [[ $selection == 10 ]]
  then
    registryLogin
  else
    printf "Exiting\n\n"
    exit 1
  fi
}

containerNotRunningMenu() {
  printf "\n\nWhat do you want to do?\n\n"
  printf "1. Run %s\n" $appName
  printf "2. Build %s\n" $appName
  printf "3. Build and Export %s for current processor architecture\n" $appName
  printf "4. Build and Export %s for AMD64 architecture\n" $appName
  printf "5. Upload %s to registry\n" $appName
  printf "6. Build, Export, and Upload %s to registry\n" $appName
  printf "7. Login to registry\n"
  printf "Any other key exits\n"
  read -p "Select: " selection

  if [[ $selection == 1 ]]
  then
    runContainer
  elif [[ $selection == 2 ]]
  then
    buildContainer
  elif [[ $selection == 3 ]]
  then
    buildContainer
    exportContainer
  elif [[ $selection == 4 ]]
  then
    buildAMD64Container
    exportContainer
  elif [[ $selection == 5 ]]
  then
    uploadImage
  elif [[ $selection == 6 ]]
  then
    buildAMD64Container
    exportContainer
    uploadImage
  elif [[ $selection == 7 ]]
  then
    registryLogin
  else
    printf "Exiting\n\n"
    exit 1
  fi
}

openShell() {
  docker exec -it $appName sh
}

showHelp() {
  printf "%s server management script. This script can Start, Stop and Restart the docker container for %s and show or tail logs.
  Several command line arguments exist for easier access:

  --start - Starts the container, if it's not running
  --restart - Restarts the container if it's running and starts the container if it's not running.
  --stop - Stops the container if it's running
  --shell - Opens a shell in the running container
  --logs - Displays the logs for the container
  --follow - Tails the logs for the container. This must be used after the '--logs' argument
  \n" $appName $appName
}

isContainerRunning
containerRunning=$?

getUserInput

if [[ $1 == "--restart" && $containerRunning == 1 ]]
then
  restartContainer

elif [[ $1 == "--restart" ]]
then
  startContainer

elif [[ $1 == "--start" && $containerRunning == 1 ]]
then
  printf "Container already started\n"
  exit 0

elif [[ $1 == "--start" ]]
then
  startContainer

elif [[ $1 == "--stop" && $containerRunning == 0 ]]
then
  printf "Container already stopped\n"
  exit 0

elif [[ $1 == "--stop" ]]
then
  stopContainer

elif [[ $1 == "--logs" && $2 == "--follow" ]]
then
  tailContainerLogs

elif [[ $1 == "--logs" ]]
then
  showContainerLogs

elif [[ $1 == "--shell" ]]
then
  openShell

elif [[ $1 == "--help" || $1 == "-h" ]]
then
  showHelp

else
  getUserInput
fi