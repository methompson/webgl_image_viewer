if ["$registryAppName" = ""]
then
  registryAppName=$appName
fi

echo $registryUrl

startContainer() {
  if [ $isAvailable -eq 1 ]
  then
    printf "Starting %s\n" $appName
    docker start $appName
  else
    printf "Running %s\n" $appName
    $runScript
  fi
}

restartContainer() {
  printf "Restarting %s\n" $appName
  docker restart $appName
}

stopContainer() {
  printf "Stopping %s\n" $appName
  docker stop $appName
}

showContainerLogs() {
  docker logs $appName
}

tailContainerLogs() {
  docker logs $appName --follow
}

isContainerRunning() {
  containerRunning=`docker container ls -f "name=$appName" -q | wc -l`
  echo $containerRunning
}

isContainerAvailable() {
  containerAvailable=`docker ps -a -f "name=$appName" -q | wc -l`
  echo $containerAvailable
}

getUserInput() {
  if [ $containerRunning -eq 1 ]
  then
    printf "%s is running" $appName
    containerRunningMenu
  else
    printf "%s is not running" $appName
    containerNotRunningMenu
  fi
}

registryLogin() {
  docker login $registryUrl --username methompson
}

pullLatestImage() {
  if ["$registryUrl" = ""]
  then
    docker pull $registryAppName
  else
    docker pull $registryUrl/$registryAppName
  fi 
}

resetImage() {
  # Stop the container if it's running
  if [ "$containerRunning" -eq "1" ]
  then
    stopContainer
  fi

  # Remove existing container to reset, pull the latest
  # image and then reset the isAvailable variable
  docker container rm $appName
  pullLatestImage
  isAvailable=$(isContainerAvailable)

  # If it was running, then start it up
  if [ "$containerRunning" -eq "1" ]
  then
    startContainer
  fi
}

containerRunningMenu() {
  printf "\n\nWhat do you want to do?\n\n"
  printf "1. Stop the %s container\n" $appName
  printf "2. Restart the %s container\n" $appName
  printf "3. See the logs of %s\n" $appName
  printf "4. Tail the logs of %s\n" $appName
  printf "5. Open a shell for %s\n" $appName
  printf "6. Login to registry\n"
  printf "7. Pull Latest Image\n"
  printf "8. Reset Container\n"
  printf "Any other key exits\n"
  read -p "Select: " selection

  if [ "$selection" = "1" ]
  then
    stopContainer
  elif [ "$selection" = "2" ]
  then
    restartContainer
  elif [ "$selection" = "3" ]
  then
    showContainerLogs
  elif [ "$selection" = "4" ]
  then
    tailContainerLogs
  elif [ "$selection" = "5" ]
  then
    openShell
  elif [ "$selection" = "6" ]
  then
    registryLogin
  elif [ "$selection" = "7" ]
  then
    pullLatestImage
  elif [ "$selection" = "8" ]
  then
    resetImage
  else
    printf "Exiting\n\n"
    exit 1
  fi
}

containerNotRunningMenu() {
  printf "\n\nWhat do you want to do?\n\n"
  printf "1. Start the %s container\n" $appName
  printf "2. See the logs of %s\n" $appName
  printf "3. Login to registry\n"
  printf "4. Pull latest image\n"
  printf "5. Reset Container\n"
  printf "Any other key exits\n"
  read -p "Select: " selection

  if [ "$selection" = "1" ]
  then
    startContainer
  elif [ "$selection" = "2" ]
  then
    showContainerLogs
  elif [ "$selection" = "3" ]
  then
    registryLogin
  elif [ "$selection" = "4" ]
  then
    pullLatestImage
  elif [ "$selection" = "5" ]
  then
    resetImage
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

containerRunning=$(isContainerRunning)
isAvailable=$(isContainerAvailable)

if [ "$1" = "--restart" -a "$containerRunning" = "1" ]
then
  restartContainer

elif [ "$1" = "--restart" ]
then
  startContainer

elif [ "$1" = "--start" -a "$containerRunning" = "1" ]
then
  printf "Container already started\n"
  exit 0

elif [ "$1" == "--start" ]
then
  startContainer

elif [ "$1" == "--stop" -a "$containerRunning" = "0" ]
then
  printf "Container already stopped\n"
  exit 0

elif [ "$1" == "--stop" ]
then
  stopContainer

elif [ "$1" == "--logs" -a "$2" == "--follow" ]
then
  tailContainerLogs

elif [ "$1" == "--logs" ]
then
  showContainerLogs

elif [ "$1" == "--shell" ]
then
  openShell

elif [ "$1" == "--reset" ]
then
  resetImage

elif [ "$1" == "--help" -o "$1" == "-h" ]
then
  showHelp

else
  getUserInput
fi
