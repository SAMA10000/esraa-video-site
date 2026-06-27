<?php
// عدّلي القيم دي على السيرفر قبل التشغيل.
// الأفضل في الإنتاج استخدام Environment Variables لو متاحة.
return [
    'host' => getenv('MYSQL_HOST') ?: '127.0.0.1',
    'port' => getenv('MYSQL_PORT') ?: '3306',
    'database' => getenv('MYSQL_DATABASE') ?: 'arabshortdrama',
    'username' => getenv('MYSQL_USERNAME') ?: 'CHANGE_ME_DB_USER',
    'password' => getenv('MYSQL_PASSWORD') ?: 'CHANGE_ME_DB_PASSWORD',
    'charset' => 'utf8mb4',
];
