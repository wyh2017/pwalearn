/**
 * service worker
 */
const staticCacheName = 'doubandemo-static-v14';//缓存静态资源
const apiCacheName = 'doubandemo-api-v14';//缓存接口

//需要缓存的资源清单
const cacheFiles = [
    '/',
    './index.html',
    './js/base64util.js',
    './js/index.js',
    './js/ajax.js',
    './js/vue.js',
    './css/style.css',
    './images/loading.svg',
    './images/logo.png',
    './images/icons/book-128.png',
    './images/movie01.jpg',
    './images/movie02.jpg',
    './images/movie03.jpg',
    './images/movie04.jpg',
    './images/movie05.jpg',
    './images/movie06.jpg',
    './images/movie07.jpg',
    './images/movie08.jpg',
    './images/pc_icon.png',
    './images/search-icon.png',
    './images/top500_bg.jpg',
    './images/top500.jpg',
    './images/weekly.jpg',
];

// 监听install事件，安装完成后，进行文件缓存
self.addEventListener('install', event=> {
    console.log('Service Worker 状态： install');
    let cacheOpen = caches.open(staticCacheName).then(cache=> {
        return cache.addAll(cacheFiles);
    });
    event.waitUntil(cacheOpen);
    return self.skipWaiting(); //跳过等待
});

// 监听activate事件，激活后通过cache的key来判断是否更新cache中的静态资源
self.addEventListener('activate', event => {
    console.log('Service Worker 状态： activate');
    let cachePromise = caches.keys().then(keys=>{
        return Promise.all(keys.map(function (key) {
            if (key !== staticCacheName && key !== apiCacheName) {
                return caches.delete(key);
            }
        }));
    })
    event.waitUntil(cachePromise);
    return self.clients.claim();// 注意不能忽略这行代码，否则第一次加载会导致fetch事件不触发
});


//拦截客户端的所有请求
self.addEventListener('fetch', event => {
    // 需要缓存的api请求
    let cacheRequestUrls = [
        '/queryMovies'
    ];
    console.log('现在正在请求：' + event.request.url);

    // 判断当前请求是否需要缓存
    let needCache = cacheRequestUrls.some(url=> {
        return event.request.url.indexOf(url) > -1;
    });

    if (needCache) {
        //优先请求网络
        caches.open(apiCacheName).then(function (cache) {
            return fetch(event.request).then(function (response) {
                console.log(response);
                cache.put(event.request.url, response.clone());
                return response;
            });
        });
    } else {
        // 非api请求，直接查询cache
        event.respondWith(
            caches.match(event.request).then(cache=> {
                return cache || fetch(event.request);
            }).catch(err=> {
                console.log(err);
                return fetch(event.request);
            })
        );
    }
});

// 监听服务器发送过来的消息
self.addEventListener('push', event=> {
    let data = event.data;
    if (event.data) {
        data = data.json();
        console.log('push的数据为：', data);
        let title = data.title;
        let options = {
            body: data.name,
            image: '/images/movie02.jpg',
            icon: '/images/icons/book-128.png',
            actions: [{
                action: 'show-book',
                title: '去看看'
            }, {
                action: 'contact-me',
                title: '联系我'
            }],
            tag: 'pwa-starter',
            renotify: true
        };
        self.registration.showNotification(title, options);
    } else {
        console.log('push没有任何数据');
    }
});

// 监听通知栏的点击事件
self.addEventListener('notificationclick', event=> {
    let action = event.action;
    console.log(`action tag: ${event.notification.tag}`, `action: ${action}`);

    switch (action) {
        case 'show-book':
            console.log('show-book');
            break;
        case 'contact-me':
            console.log('contact-me');
            break;
        default:
            console.log(`未处理的action: ${event.action}`);
            action = 'default';
            break;
    }
    event.notification.close();

    event.waitUntil(
        // 获取所有clients
        self.clients.matchAll().then(clients=> {
            if (!clients || clients.length === 0) {
                // 当不存在client时，打开该网站
                self.clients.openWindow && self.clients.openWindow('http://127.0.0.1:8000');
                return;
            }
            // 切换到该站点的tab
            clients[0].focus && clients[0].focus();
            clients.forEach(client=> {
                // 使用postMessage进行通信
                client.postMessage(action);
            });
        })
    );
});