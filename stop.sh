docker system prune -af
docker stop `docker ps -q`
docker rm `docker ps -aq`
docker rmi `docker image -aq`
docker volume rm `docker volume ls -q`
docker network rm `docker network ls -q`
docker system prune -af