from django.urls import path
from . import views
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.conf.urls.static import static

app_name = 'chatapp'

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('upload/', login_required(views.upload_file), name='upload_file'),
    path('profile/', login_required(views.profile), name='profile'),
    path('', login_required(views.index), name='index'),
    path('<str:room_name>/', login_required(views.room), name='room'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
