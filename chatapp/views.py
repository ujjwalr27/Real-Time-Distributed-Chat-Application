from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Room, Message

# Create your views here.

@login_required
def index(request):
    rooms = Room.objects.all()
    return render(request, 'chatapp/index.html', {
        'rooms': rooms
    })

@login_required
def room(request, room_name):
    room, created = Room.objects.get_or_create(name=room_name)
    messages = Message.objects.filter(room=room)[:100]
    return render(request, 'chatapp/room.html', {
        'room': room,
        'messages': messages
    })
