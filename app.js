var ws = require("nodejs-websocket");
var moment = require('moment');

console.log("开始建立连接...")

let users = [];
let conns = {};
let groups = [];
let pvplist = [];
let pvpitem = [];

function boardcast(obj) {
    console.log(obj)
        //重置匹配，删除数组，状态改变为0
    if (obj.reset && obj.reset.length) {
        var i;
        obj.reset.forEach(x => {
            pvplist.forEach((item, index) => {
                item.forEach(v => {
                    if (v.uid === x) {
                        i = index;
                    }
                })

            })
            users.forEach(item => {
                if (item.uid === x) {
                    item.pvpStatus = 0;
                }
            })
            pvplist.splice(1, i);
        })
        if (i) {
            conns[obj.uid].sendText(JSON.stringify(obj));
        } else {
            conns[obj.uid].sendText(JSON.stringify({
                type: 5,
                msg: '当前用户不存在！'
            }));
        }
        return;
    }
    if (obj.pvpitem && obj.pvpitem.length) {
        obj.pvpitem.forEach(item => {
            conns[item.uid].sendText(JSON.stringify(obj));
        })
        return;
    }
    if (obj.bridge && obj.bridge.length) {
        obj.bridge.forEach(item => {
            console.log("bridge：" + item)
            conns[item].sendText(JSON.stringify(obj));
        })
        return;
    }
    if (obj.groupId) {
        group = groups.filter(item => {
            return item.id === obj.groupId
        })[0];
        group.users.forEach(item => {
            conns[item.uid].sendText(JSON.stringify(obj));
        })
        return;
    }

    server.connections.forEach((conn, index) => {
        conn.sendText(JSON.stringify(obj));
    })
}

var server = ws.createServer(function(conn) {
    conn.on("text", function(obj) {
        console.log("服务端接收到消息：" + obj)
        obj = JSON.parse(obj);
        conns['' + obj.uid + ''] = conn;
        switch (obj.type) {
            // 创建连接
            case 1:
                let isuser = users.some(item => {
                    return item.uid === obj.uid
                })
                if (!isuser) {
                    users.push({
                        nickname: obj.nickname,
                        uid: obj.uid,
                        status: 1,
                        pvpStatus: 0 //0代表当前用户没有在对战中 1对战中
                    });
                } else {
                    users.map((item, index) => {
                        if (item.uid === obj.uid) {
                            item.status = 1;
                            item.pvpStatus = 0;
                        }
                        return item;
                    })
                }
                boardcast({
                    type: 1,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: obj.nickname + '加入对战',
                    users: users,
                    groups: groups,
                    uid: obj.uid,
                    nickname: obj.nickname
                });
                break;
                // 注销
            case 2:
                // delete conns[''+obj.uid+''];
                users.map((item, index) => {
                    if (item.uid === obj.uid) {
                        item.status = 0;
                    }
                    return item;
                })
                boardcast({
                    type: 1,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: obj.nickname + '退出了对战',
                    users: users,
                    groups: groups,
                    uid: obj.uid,
                    nickname: obj.nickname,
                    bridge: []
                });
                break;
                // 创建群
            case 3:
                console.log('pvplist：', pvplist.length);
                if (users.length > 1) {
                    //pvpitem表示组队，每组小队两个人。
                    if (pvpitem.length >= 2) {
                        pvpitem = [];
                    }
                    users.forEach(item => {
                        if (item.uid === obj.uid) {
                            if (item.pvpStatus === 0) {
                                pvpitem.push(obj);
                                item.pvpStatus = 1;
                                console.log('对战中匹配。。。', pvpitem.length)
                                if (pvpitem.length >= 2) {
                                    pvplist.push(pvpitem);
                                    boardcast({
                                        type: 3,
                                        date: moment().format('YYYY-MM-DD HH:mm:ss'),
                                        msg: '匹配成功！',
                                        users: users,
                                        groups: groups,
                                        uid: obj.uid,
                                        nickname: obj.nickname,
                                        pvpitem: pvpitem
                                    });
                                } else {
                                    console.log('在对战中匹配进入。。。')
                                    boardcast({
                                        type: 3,
                                        date: moment().format('YYYY-MM-DD HH:mm:ss'),
                                        msg: '正在匹配中...',
                                        users: users,
                                        groups: groups,
                                        uid: obj.uid,
                                        nickname: obj.nickname,
                                        pvpitem: pvpitem
                                    });
                                }
                            } else {
                                boardcast({
                                    type: 3,
                                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                                    msg: '正在匹配中...',
                                    users: users,
                                    groups: groups,
                                    uid: obj.uid,
                                    nickname: obj.nickname,
                                    pvpitem: pvpitem
                                });
                            }
                        }
                    })
                } else {
                    //在线用户小于两人，等待匹配
                    boardcast({
                        type: 3,
                        date: moment().format('YYYY-MM-DD HH:mm:ss'),
                        msg: '正在匹配中...',
                        users: users,
                        groups: groups,
                        uid: obj.uid,
                        nickname: obj.nickname,
                        pvpitem: pvpitem
                    });
                }
                break;
            case 4:
                boardcast({
                    type: 4,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: obj.msg,
                    users: users,
                    groups: groups,
                    uid: obj.uid,
                    nickname: obj.nickname,
                    bridge: obj.bridge
                });
                break;
            case 5:
                boardcast({
                    type: 5,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: '重置匹配对象成功！',
                    users: users,
                    groups: groups,
                    uid: obj.uid,
                    nickname: obj.nickname,
                    reset: obj.bridge
                });
                break;
            case 10:
                groups.push({
                    id: moment().valueOf(),
                    name: obj.groupName,
                    users: [{
                        uid: obj.uid,
                        nickname: obj.nickname
                    }]
                })
                boardcast({
                    type: 1,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: obj.nickname + '创建了群' + obj.groupName,
                    users: users,
                    groups: groups,
                    uid: obj.uid,
                    nickname: obj.nickname,
                    bridge: obj.bridge
                });
                break;
                // 加入群
            case 20:
                let group = groups.filter(item => {
                    return item.id === obj.groupId
                })[0]
                group.users.push({
                    uid: obj.uid,
                    nickname: obj.nickname
                })
                boardcast({
                    type: 1,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: obj.nickname + '加入了群' + obj.groupName,
                    users: users,
                    groups: groups,
                    uid: obj.uid,
                    nickname: obj.nickname,
                    bridge: obj.bridge
                });
                break;
                // 发送消息
            default:
                boardcast({
                    type: 2,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    msg: obj.msg,
                    uid: obj.uid,
                    nickname: obj.nickname,
                    bridge: obj.bridge,
                    groupId: obj.groupId,
                    status: 1
                });
                break;
        }
    })
    conn.on("close", function(code, reason) {
        console.log("关闭连接")
    });
    conn.on("error", function(code, reason) {
        console.log("异常关闭")
    });
}).listen(8001)
console.log("WebSocket建立完毕, port: 8001")