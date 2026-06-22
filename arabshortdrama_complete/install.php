<?php
declare(strict_types=1);
http_response_code(403);
header('Content-Type: text/plain; charset=utf-8');
echo "Installer is disabled for production security.\n";
echo "Use database/schema_mysql.sql, database/strict_mysql_repair_migration.sql, and database/seed_mysql.sql manually during controlled deployment.\n";
exit;
