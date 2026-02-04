import http.server
import socketserver
import webbrowser
import threading

class MyHTTPRequestHandler(socketserver.BaseRequestHandler):
    def do_GET(self):
        if self.path == '/':
            try:
                with open('web.html', 'r', encoding='utf-8') as f:
                    content = f.read()
                self.send_response(200, ('Content-Type', 'text/html'), content)
            except FileNotFoundError:
                self.send_response(404, ('Content-Type', 'text/plain'), 'File not found')
        else:
            self.send_response(404, ('Content-Type', 'text/plain'), 'Not found')

def main():
    server_address = ('', 8000)
    httpd = http.server.HTTPServer(server_address, MyHTTPRequestHandler)
    
    print("Red Alert 2 Mobile RTS Game Server")
    print("Server running on: http://localhost:8000")
    print("Game URL: http://localhost:8000/web.html")
    print("Controls:")
    print("  Click unit to select")
    print("  Click ground to move selected unit")
    print("  Use buttons to build structures")
    print("  Units auto-attack enemies")
    print()
    print("Game is ready! Opening browser...")
    
    def open_browser():
        try:
            webbrowser.open('http://localhost:8000/web.html')
            print("Browser opened successfully!")
        except:
            print("Manually open: http://localhost:8000/web.html")
    
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == "__main__":
    main()