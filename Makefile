export HOST_HOSTNAME=$(shell hostname)

all :
	docker compose -f ./docker-compose.yml 
	docker compose -f ./docker-compose.yml up

clean :
	docker compose -f ./docker-compose.yml down

fclean : clean
	docker-compose down --volumes --remove-orphans
	docker system prune -af
	docker volume prune -f 
	unset HOST_HOSTNAME

.PHONY : all clean fclean
