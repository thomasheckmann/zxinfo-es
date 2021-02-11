<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit18782813a0c4b0ac2f8100811de26e9f
{
    public static $prefixLengthsPsr4 = array (
        'Z' => 
        array (
            'ZxImage\\' => 8,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'ZxImage\\' => 
        array (
            0 => __DIR__ . '/..' . '/moroz1999/zx-image/ZxImage',
        ),
    );

    public static $prefixesPsr0 = array (
        'G' => 
        array (
            'GifCreator' => 
            array (
                0 => __DIR__ . '/..' . '/moroz1999/gif-creator/src',
            ),
        ),
    );

    public static $classMap = array (
        'Composer\\InstalledVersions' => __DIR__ . '/..' . '/composer/InstalledVersions.php',
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit18782813a0c4b0ac2f8100811de26e9f::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit18782813a0c4b0ac2f8100811de26e9f::$prefixDirsPsr4;
            $loader->prefixesPsr0 = ComposerStaticInit18782813a0c4b0ac2f8100811de26e9f::$prefixesPsr0;
            $loader->classMap = ComposerStaticInit18782813a0c4b0ac2f8100811de26e9f::$classMap;

        }, null, ClassLoader::class);
    }
}