from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='apartment',
            name='bedrooms',
            field=models.IntegerField(choices=[(1, '1 Bedroom'), (2, '2 Bedrooms')], default=1),
        ),
    ]
