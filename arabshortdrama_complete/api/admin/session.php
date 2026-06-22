<?php
require_once __DIR__ . '/../config/bootstrap.php';
$admin = current_admin();
if (!$admin) json_response(['valid'=>false]);
json_response(['valid'=>true,'username'=>$admin['username'],'role'=>$admin['role']]);
