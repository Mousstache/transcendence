from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from homegame.models import User

UserModel = get_user_model()

ADMIN_ID = 'admin'
ADMIN_PASSWORD = 'admin'

def create_or_update_superuser(username, email, password, description=None, pseudo=None, image_path=None, coalition=User.ALLIANCE):
    created = False
    try:
        # Try to create a new superuser
        superuser = UserModel.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        created = True
    except IntegrityError:
        # If the username already exists, get the existing user
        try:
            superuser = UserModel.objects.get(username=username)
            # Update the user to be a superuser
            superuser.is_superuser = True
            superuser.is_staff = True
            superuser.set_password(password)
        except UserModel.DoesNotExist:
            # Handle the case where the user does not exist, which shouldn't happen due to the IntegrityError
            raise Exception(f"User with username {username} does not exist but an IntegrityError was raised.")
    
    # Set additional fields
    superuser.description = description
    superuser.pseudo = pseudo
    superuser.coalition = coalition
    
    # Save the superuser
    superuser.save()
    
    return superuser, created

class Command(BaseCommand):
    help = 'Initializes the local development environment'

    def handle(self, *args, **kwargs):
        users_to_create = [
            {
                'username': "admin",
                'email': "admin@example.com",
                'password': "password",
                'description': "The main administrator",
                'pseudo': "Admin",
                'image_path': "",
                'coalition': User.ORDER
            },
            {
                'username': "toto",
                'email': "toto@example.com",
                'password': "password",
                'description': "The main toto",
                'pseudo': "toto",
                'image_path': "",
                'coalition': User.ALLIANCE
            },
            {
                'username': "rolens",
                'email': "toto@example.com",
                'password': "password",
                'description': "The main botting",
                'pseudo': "Robbie_lens",
                'image_path': "",
                'coalition': User.FEDERATION
            }
        ]

        for user_data in users_to_create:
            try:
                superuser, created = create_or_update_superuser(**user_data)
                if created:
                    self.stdout.write(self.style.SUCCESS(f"Superuser '{superuser.username}' created successfully."))
                else:
                    self.stdout.write(self.style.WARNING(f"Superuser '{superuser.username}' already existed and was updated."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating or updating superuser '{user_data['username']}': {e}"))

        self.stdout.write(self.style.SUCCESS("All Done!"))
