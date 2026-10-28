<?php
declare(strict_types=1);

namespace CertiShield;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(?array $configOverride = null): PDO
    {
        if (self::$instance !== null && $configOverride === null) {
            return self::$instance;
        }

        $config = $configOverride ?? require __DIR__ . '/../config/app.php';
        $dbConfig = $config['db'];

        $driver = strtolower($dbConfig['driver'] ?? 'mysql');

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if ($driver === 'sqlite') {
            $path = $dbConfig['sqlite_path'];
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $pdo = new PDO("sqlite:{$path}", null, null, $options);
            $pdo->exec("PRAGMA foreign_keys = ON;");
            if ($configOverride === null) {
                self::$instance = $pdo;
            }
            return $pdo;
        }

        // MySQL / MariaDB connection
        $host = $dbConfig['host'];
        $port = (int)$dbConfig['port'];
        $dbname = $dbConfig['database'];
        $user = $dbConfig['username'];
        $pass = $dbConfig['password'];

        $candidates = array_unique([$port, 3307, 3306]);
        $lastException = null;

        foreach ($candidates as $candidatePort) {
            try {
                $dsn = "mysql:host={$host};port={$candidatePort};dbname={$dbname};charset=utf8mb4";
                $pdo = new PDO($dsn, $user, $pass, $options);
                if ($configOverride === null) {
                    self::$instance = $pdo;
                }
                return $pdo;
            } catch (PDOException $e) {
                $lastException = $e;
            }
        }

        // If specific db didn't exist, try connecting to server root to create it
        foreach ($candidates as $candidatePort) {
            try {
                $dsn = "mysql:host={$host};port={$candidatePort};charset=utf8mb4";
                $pdo = new PDO($dsn, $user, $pass, $options);
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                $pdo->exec("USE `{$dbname}`;");
                if ($configOverride === null) {
                    self::$instance = $pdo;
                }
                return $pdo;
            } catch (PDOException $e) {
                $lastException = $e;
            }
        }

        throw new RuntimeException("Could not connect to database on ports " . implode(',', $candidates) . ": " . ($lastException ? $lastException->getMessage() : 'Unknown error'));
    }

    public static function setConnection(PDO $pdo): void
    {
        self::$instance = $pdo;
    }

    public static function reset(): void
    {
        self::$instance = null;
    }
}
