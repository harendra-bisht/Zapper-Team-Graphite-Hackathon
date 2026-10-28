<?php
declare(strict_types=1);

return [
    'app' => [
        'name' => getenv('APP_NAME') ?: 'CertiShield',
        'env' => getenv('APP_ENV') ?: 'local',
        'url' => getenv('APP_URL') ?: 'http://localhost:8000',
        'debug' => (bool)(getenv('APP_DEBUG') ?: true),
        'secret_key' => getenv('APP_SECRET') ?: 'certishield-graphite26-secret-key-32chars!!',
    ],
    'db' => [
        'driver' => getenv('DB_DRIVER') ?: 'mysql', // 'mysql' or 'sqlite'
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int)(getenv('DB_PORT') ?: 3307),
        'database' => getenv('DB_NAME') ?: 'certishield',
        'username' => getenv('DB_USER') ?: 'root',
        'password' => getenv('DB_PASS') !== false ? getenv('DB_PASS') : '',
        'sqlite_path' => __DIR__ . '/../storage/certishield.sqlite',
    ],
    'security' => [
        'session_lifetime' => 7200, // 2 hours
        'max_login_attempts' => 5,
        'lockout_time' => 900, // 15 mins
        'verify_rate_limit' => 60, // max 60 verifications per IP per minute
    ]
];
