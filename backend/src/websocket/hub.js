const { WebSocketServer } = require("ws");
const { URL } = require("url");

const adminClients = new Set();
const adminMonitorClients = new Set();
const studentClientsByCode = new Map();

function sendJson(ws, payload) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const channel = url.searchParams.get("channel");
    const testCode = url.searchParams.get("testCode") || "";

    if (channel === "admin") {
      adminClients.add(ws);
    } else if (channel === "student" && testCode) {
      studentClientsByCode.set(testCode, ws);
    } else if (channel === "monitor" || channel === "ADMIN_MONITOR") {
      adminMonitorClients.add(ws);
    }

    ws.on("close", () => {
      adminClients.delete(ws);
      adminMonitorClients.delete(ws);
      if (testCode) {
        studentClientsByCode.delete(testCode);
      }
    });

    ws.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (message?.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG", ts: Date.now() }));
      }

      if (message?.type === "ADMIN_SUBSCRIBE") {
        adminMonitorClients.add(ws);
        ws.send(JSON.stringify({ type: "ADMIN_SUBSCRIBED", ts: Date.now() }));
      }

      if (message?.type === "STUDENT_CONNECT" && message?.testCode) {
        studentClientsByCode.set(String(message.testCode), ws);
      }

      if ((message?.type === "SCREEN_OFFER" || message?.type === "ICE_CANDIDATE") && channel === "student") {
        const testCodeFromMsg = String(message.testCode || testCode || "");
        if (!testCodeFromMsg) return;
        const payload = { ...message, testCode: testCodeFromMsg };
        for (const client of adminMonitorClients) {
          sendJson(client, payload);
        }
      }

      if ((message?.type === "SCREEN_ANSWER" || message?.type === "ICE_CANDIDATE") && (channel === "monitor" || channel === "ADMIN_MONITOR")) {
        const targetCode = String(message.testCode || "");
        if (!targetCode) return;
        sendJson(studentClientsByCode.get(targetCode), message);
      }

      if (message?.type === "REQUEST_SCREEN" && (channel === "monitor" || channel === "ADMIN_MONITOR")) {
        const targetCode = String(message.testCode || "");
        if (!targetCode) return;
        sendJson(studentClientsByCode.get(targetCode), { type: "REQUEST_SCREEN", testCode: targetCode });
      }
    });
  });
}

function broadcastToAdmins(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, ts: Date.now() });
  for (const client of adminClients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

function sendToStudent(testCode, eventTypeOrMessage, payload) {
  const ws = studentClientsByCode.get(testCode);
  if (ws && ws.readyState === 1) {
    if (typeof eventTypeOrMessage === "string") {
      ws.send(JSON.stringify({ type: eventTypeOrMessage, payload, ts: Date.now() }));
      return;
    }
    ws.send(JSON.stringify(eventTypeOrMessage));
  }
}

function broadcastToAdminMonitor(eventType, payload) {
  const data = JSON.stringify({ type: eventType, ...payload, ts: Date.now() });
  for (const client of adminMonitorClients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

module.exports = {
  attachWebSocketServer,
  broadcastToAdmins,
  broadcastToAdminMonitor,
  sendToStudent,
};
