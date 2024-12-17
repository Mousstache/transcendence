FROM debian:bullseye

RUN apt-get update -y 
RUN apt-get install -y nginx
RUN apt-get install -y curl
RUN mkdir -p /etc/nginx/ssl
RUN apt install libssl-dev -y 

# generation des certificats et des cles pour ssl/tls
RUN openssl req -x509 -nodes -out /etc/nginx/ssl/inception.crt -keyout /etc/nginx/ssl/inception.key -subj "/C=FR/ST=IDF/L=Paris/O=42/OU=42/CN=azhou.42.fr/UID=azhou"

COPY /src/nginx/conf/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app

COPY ./frontend /app

ENTRYPOINT ["nginx", "-g", "daemon off;"]
