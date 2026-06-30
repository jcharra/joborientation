FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    openldap-dev \
    oniguruma-dev \
    libzip-dev \
    zip \
    unzip \
    curl

RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    ldap \
    mbstring \
    zip \
    opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --optimize \
    && chown -R www-data:www-data storage bootstrap/cache
