# Distributed Chat System

A real-time chat application built with Django and WebSocket technology, enabling instant messaging across multiple chat rooms.

## Features

- Real-time messaging using WebSocket
- Multiple chat room support
- User authentication
- Message history
- Clean and responsive UI
- Distributed architecture using Redis for message broadcasting

## Technology Stack

- Backend: Django 5.0.1
- WebSocket: Django Channels 4.0.0
- Message Broker: Redis
- Frontend: HTML, JavaScript, CSS
- ASGI Server: Daphne 4.0.0

## Prerequisites

- Python 3.11 or higher
- Redis Server
- Virtual Environment

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Create and activate virtual environment:
```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run database migrations:
```bash
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

## Running the Application

1. Make sure Redis server is running

2. Start the application using Daphne:
```bash
daphne -b 0.0.0.0 -p 8000 chat_project.asgi:application
```

3. Access the application:
- Open your web browser and navigate to `http://127.0.0.1:8000`
- Log in with your credentials
- Start chatting!

## Usage

1. **Login**: Use your superuser credentials or create a new account

2. **Join/Create Chat Room**: 
   - Enter a room name in the input field
   - If the room exists, you'll join it
   - If it doesn't exist, a new room will be created

3. **Chatting**:
   - Type your message in the input field
   - Press Enter or click Send
   - Messages appear in real-time for all users in the room

## Project Structure

```
chat_project/
├── requirements.txt
├── manage.py
├── chat_project/
│   ├── settings.py
│   ├── urls.py
│   └── asgi.py
└── chatapp/
    ├── models.py
    ├── views.py
    ├── consumers.py
    ├── routing.py
    └── templates/
```

## Key Components

- `consumers.py`: WebSocket consumer for handling real-time messages
- `models.py`: Database models for Room and Message
- `routing.py`: WebSocket URL routing
- `views.py`: HTTP views for rendering pages
- `templates/`: HTML templates for the UI

## Testing Multiple Users

1. Open multiple browser windows or incognito tabs
2. Log in with different accounts
3. Join the same chat room
4. Start sending messages to see real-time communication

## Troubleshooting

1. **WebSocket Connection Issues**:
   - Ensure Redis server is running
   - Check if Daphne server is running
   - Verify WebSocket URL in browser console

2. **Database Issues**:
   - Run migrations
   - Check database configuration in settings.py

3. **Redis Connection Issues**:
   - Verify Redis is running on default port (6379)
   - Check Redis connection settings in settings.py

## Contributing

Feel free to fork the repository and submit pull requests for any improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
