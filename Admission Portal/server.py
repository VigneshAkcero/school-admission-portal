import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse
from datetime import datetime

PORT = 8000
DB_FILE = 'portal.db'

# Database Setup
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users 
                 (email TEXT PRIMARY KEY, password TEXT, role TEXT, dashboard TEXT)''')
    # Default users
    c.executemany('INSERT OR IGNORE INTO users VALUES (?,?,?,?)', [
        ('principal@alphabuddy.com', 'admin123', 'principal', 'index.html'),
        ('admin@alphabuddy.com', 'admin123', 'admin', 'admin.html')
    ])
    
    # Students table
    c.execute('''CREATE TABLE IF NOT EXISTS students 
                 (test_code TEXT PRIMARY KEY, name TEXT, parent_name TEXT, parent_mobile TEXT, grade INTEGER, timestamp DATETIME)''')
    
    # Tests table
    c.execute('''CREATE TABLE IF NOT EXISTS tests 
                 (id TEXT PRIMARY KEY, name TEXT, subject TEXT, participants INTEGER, progress REAL, status TEXT, date TEXT, duration INTEGER)''')
    
    # Submissions table
    c.execute('''CREATE TABLE IF NOT EXISTS submissions 
                 (test_code TEXT PRIMARY KEY, student_name TEXT, grade INTEGER, answers TEXT, score INTEGER, duration INTEGER, submitted_at DATETIME)''')
    
    # Counter table for test codes
    c.execute('''CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, val INTEGER)''')
    c.execute('INSERT OR IGNORE INTO counters VALUES ("test_number", 1)')
    
    conn.commit()
    conn.close()

class PortalHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if url.path.startswith('/api/'):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            response_data = {"error": "Endpoint not found"}
            status_code = 404

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()

            try:
                if url.path == '/api/login':
                    c.execute("SELECT * FROM users WHERE email=? AND password=?", (data.get('email'), data.get('password')))
                    user = c.fetchone()
                    if user:
                        response_data = {"email": user[0], "role": user[2], "dashboard": user[3]}
                        status_code = 200
                    else:
                        response_data = {"error": "Invalid credentials"}
                        status_code = 401

                elif url.path == '/api/students/register':
                    # Get next test number
                    c.execute("SELECT val FROM counters WHERE name='test_number'")
                    test_num = c.fetchone()[0]
                    
                    # Generate code: MPSYYMM{Grade}{Test Number}
                    now = datetime.now()
                    yy = now.strftime('%y')
                    mm = now.strftime('%m')
                    test_code = f"MPS{yy}{mm}{data.get('grade')}{test_num}"
                    
                    c.execute("INSERT INTO students VALUES (?,?,?,?,?,?)", 
                             (test_code, data.get('name'), data.get('parentName'), data.get('parentMobile'), data.get('grade'), datetime.now()))
                    c.execute("UPDATE counters SET val = val + 1 WHERE name='test_number'")
                    conn.commit()
                    response_data = {"testCode": test_code}
                    status_code = 200

                elif url.path == '/api/tests/save':
                    c.execute("INSERT OR REPLACE INTO tests VALUES (?,?,?,?,?,?,?,?)",
                             (data.get('id'), data.get('name'), data.get('subject'), data.get('participants'), 
                              data.get('progress'), data.get('status'), data.get('date'), data.get('duration')))
                    conn.commit()
                    response_data = {"success": True}
                    status_code = 200

                elif url.path == '/api/submissions/save':
                    c.execute("INSERT OR REPLACE INTO submissions VALUES (?,?,?,?,?,?,?)",
                             (data.get('testCode'), data.get('studentName'), data.get('grade'), 
                              json.dumps(data.get('answers')), data.get('score'), data.get('duration'), datetime.now()))
                    conn.commit()
                    response_data = {"success": True}
                    status_code = 200

            except Exception as e:
                response_data = {"error": str(e)}
                status_code = 500
            
            conn.close()
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        else:
            self.send_error(404, "None API POST requests not supported")

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path.startswith('/api/'):
            response_data = {"error": "Endpoint not found"}
            status_code = 404
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            
            try:
                if url.path == '/api/students':
                    c.execute("SELECT test_code, name, parent_name, parent_mobile, grade FROM students ORDER BY timestamp DESC")
                    students = [{"testCode": r[0], "name": r[1], "parentName": r[2], "parentMobile": r[3], "grade": r[4]} for r in c.fetchall()]
                    response_data = students
                    status_code = 200
                
                elif url.path == '/api/tests':
                    c.execute("SELECT * FROM tests ORDER BY id DESC")
                    tests = [{"id": r[0], "name": r[1], "subject": r[2], "participants": r[3], "progress": r[4], "status": r[5], "date": r[6], "duration": r[7]} for r in c.fetchall()]
                    response_data = tests
                    status_code = 200

                elif url.path == '/api/students/verify':
                    query = urllib.parse.parse_qs(url.query)
                    code = query.get('code', [None])[0]
                    c.execute("SELECT * FROM students WHERE test_code=?", (code,))
                    student = c.fetchone()
                    if student:
                        response_data = {"testCode": student[0], "name": student[1], "grade": student[4]}
                        status_code = 200
                    else:
                        response_data = {"error": "Invalid code"}
                        status_code = 404

            except Exception as e:
                response_data = {"error": str(e)}
                status_code = 500

            conn.close()
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        else:
            # Fix path for Test Resources if needed
            if 'Test%20Resources' in self.path:
                self.path = self.path.replace('Test%20Resources', 'Test Resources')
            super().do_GET()

if __name__ == "__main__":
    init_db()
    with socketserver.TCPServer(("", PORT), PortalHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        httpd.serve_forever()
