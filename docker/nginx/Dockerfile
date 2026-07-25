FROM nginx:1.27-alpine

COPY backend/public/.htaccess backend/public/favicon.ico backend/public/index.php backend/public/robots.txt /var/www/html/public/
RUN ln -s /var/www/html/storage/app/public /var/www/html/public/storage

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
