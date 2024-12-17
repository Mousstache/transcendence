from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from homegame.models import User, Friend, BlackList, PointMarque, Match, Conversation, GroupMember, Tournoi, TournoiMember, ChatModel, ChatNotification

# Register your models here.

admin.site.register(User)
admin.site.register(Friend)
admin.site.register(BlackList)
admin.site.register(PointMarque)
admin.site.register(Match)
admin.site.register(Conversation)
admin.site.register(GroupMember)
admin.site.register(Tournoi)
admin.site.register(TournoiMember)
admin.site.register(ChatModel)
admin.site.register(ChatNotification)
