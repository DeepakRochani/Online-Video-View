<?php

namespace App\Models;

use App\Core\Database;

class User
{
    public int $id;
    public string $name;
    public string $email;
    public string $password;
    public ?string $google_account_id = null;
    public ?string $avatar = null;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public static function find(int $id): ?self
    {
        $row = Database::fetch("SELECT * FROM users WHERE id = :id LIMIT 1", ['id' => $id]);
        return $row ? self::hydrate($row) : null;
    }

    public static function findByEmail(string $email): ?self
    {
        $row = Database::fetch("SELECT * FROM users WHERE email = :email LIMIT 1", ['email' => $email]);
        return $row ? self::hydrate($row) : null;
    }

    public static function create(array $data): self
    {
        $sql = "INSERT INTO users (name, email, password, google_account_id, avatar) 
                VALUES (:name, :email, :password, :google_account_id, :avatar)";
        Database::query($sql, [
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'google_account_id' => $data['google_account_id'] ?? null,
            'avatar' => $data['avatar'] ?? null,
        ]);

        return self::find((int)Database::lastInsertId());
    }

    private static function hydrate(array $row): self
    {
        $u = new self();
        $u->id = (int)$row['id'];
        $u->name = $row['name'];
        $u->email = $row['email'];
        $u->password = $row['password'];
        $u->google_account_id = $row['google_account_id'] ?? null;
        $u->avatar = $row['avatar'] ?? null;
        $u->created_at = $row['created_at'] ?? null;
        $u->updated_at = $row['updated_at'] ?? null;
        return $u;
    }
}
