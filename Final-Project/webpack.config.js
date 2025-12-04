const path = require('path');
const pkg = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const buildPath = './build/';

module.exports = {
    entry: ['./src/app.js'],
    output: {
        path: path.join(__dirname, buildPath),
        filename: '[name].[hash].js',
        publicPath: `/${pkg.repository}/`,
    },
    target: 'web',
    devtool: 'source-map',
    stats: {
        warnings: false
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: 'babel-loader',
                // Transpile our code plus a few modern ESM deps that ship untranspiled (e.g., supabase/iceberg-js)
                exclude: (modulePath) => {
                    const isNodeModule = modulePath.includes('node_modules');
                    const needsTranspile = /node_modules\/(@supabase|iceberg-js)\//.test(modulePath);
                    return isNodeModule && !needsTranspile;
                },
            },
            {
                test: /\.mjs$/,
                type: 'javascript/auto',
                include: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [
                            '@babel/plugin-proposal-optional-chaining',
                            '@babel/plugin-proposal-nullish-coalescing-operator',
                        ],
                        sourceType: 'unambiguous',
                    },
                },
            },
            {
                test: /\.(jpe?g|png|gif|svg|tga|gltf|babylon|mtl|pcb|pcd|prwm|obj|mat|mp3|ogg)$/i,
                use: 'file-loader',
                exclude: path.resolve(__dirname, './node_modules/'),
            },
            {
                test: /\.(vert|frag|glsl|shader|txt)$/i,
                use: 'raw-loader',
                exclude: path.resolve(__dirname, './node_modules/'),
            },
            {
                type: 'javascript/auto',
                test: /\.(json)/,
                exclude: path.resolve(__dirname, './node_modules/'),
                use: [
                    {
                        loader: 'file-loader',
                    },
                ],
            },
        ],
    },
    resolve: {
        alias: {
            lights$: path.resolve(__dirname, 'src/components/lights'),
            objects$: path.resolve(__dirname, 'src/components/objects'),
            scenes$: path.resolve(__dirname, 'src/components/scenes'),
        },
    },
    plugins: [
        new HtmlWebpackPlugin({ title: pkg.title, favicon: 'src/favicon.ico' }),
    ],
};
