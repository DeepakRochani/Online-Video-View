<?php

namespace App\Core;

class View
{
    public static function render(string $viewPath, array $data = [], ?string $layout = 'layouts/admin'): void
    {
        extract($data);
        
        $viewFile = __DIR__ . '/../Views/' . str_replace('.', '/', $viewPath) . '.php';
        if (!file_exists($viewFile)) {
            throw new \RuntimeException("View file not found: {$viewFile}");
        }

        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        if ($layout !== null) {
            $layoutFile = __DIR__ . '/../Views/' . str_replace('.', '/', $layout) . '.php';
            if (file_exists($layoutFile)) {
                require $layoutFile;
                return;
            }
        }

        echo $content;
    }
}
