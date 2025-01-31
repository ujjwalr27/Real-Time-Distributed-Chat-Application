from django.urls import path
from . import views
from django.contrib.auth.decorators import login_required

app_name = 'chatapp'

urlpatterns = [
    path('', login_required(views.index), name='index'),
    path('<str:room_name>/', login_required(views.room), name='room'),
]
