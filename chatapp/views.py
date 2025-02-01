from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Room, Message
from django.contrib.auth import login, logout
from django.contrib import messages
from .forms import SignUpForm

# Create your views here.

def signup(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account created successfully!')
            return redirect('chatapp:index')
    else:
        form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form})

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

@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been logged out successfully!')
    return redirect('login')
