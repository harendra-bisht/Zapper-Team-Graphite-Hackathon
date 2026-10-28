<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/Auth.php';

use CertiShield\Database;
use CertiShield\Auth;

$pdo = Database::getConnection();
Auth::logout($pdo);

header('Location: /login.php');
exit;
