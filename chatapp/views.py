from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Room, Message, UserProfile
from django.contrib.auth import login, logout
from django.contrib import messages
from django.http import JsonResponse
from .forms import SignUpForm
import json

# Create your views here.

def signup(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            UserProfile.objects.create(user=user)  # Create profile for new user
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
    if created:
        room.members.add(request.user)
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

@login_required
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        message = Message.objects.create(
            room_id=request.POST.get('room_id'),
            user=request.user,
            file=file,
            content=f'Shared a file: {file.name}'
        )
        return JsonResponse({
            'status': 'success',
            'file_url': message.file.url,
            'message_id': message.id
        })
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def profile(request):
    if request.method == 'POST':
        profile = request.user.profile
        if request.FILES.get('avatar'):
            profile.avatar = request.FILES['avatar']
        if request.POST.get('theme'):
            profile.theme_preference = request.POST['theme']
        profile.save()
        return JsonResponse({'status': 'success'})
    return render(request, 'chatapp/profile.html', {
        'profile': request.user.profile
    })
