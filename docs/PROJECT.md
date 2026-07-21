Architecture
------------
Backend: PHP / Laravel
Frontend: React
Database: PostgreSQL

Purpose
-------
The application shall be a "social platform" where people can participate
in one of two roles: Consultants or students. (An admin role should also exist)

Consultants offer time slots for a certain topic (i.e. a job kind or university studies that they can share information about). Each consultant will offer only
one topic, but maybe multiple times.

Each topic must also hav a "tag", in order for similar topics to be grouped together.

Students can then give a fixed number of tags they wish to be informed about.Default for now is 6 tags, might be changed later. Out of these 6, they will
get assigned their favourite 4 tags, if possible. 

The result for each student is then a time schedule for his 4 tags.

Both students and consultants should be able to log on to the platform.

There should be a "selection phase" and a "conference phase", which do not overlap. 

During the selection phase, students can pick their favourite tags and prioritize them in a list.

During the "conference phase" students can only view their schedule. 

For the consultants: During the "select phase" they can change their personal information, their topic and their CV/"about me" page. Maybe also a profile picture.

During the "conference phase" the consultants can only see their time slots with the participants list and the room numbers.

Code Style
----------
Use modern react, e.g. avoid useEffect.

Claude workflow
---------------
Pick the item listed under "current task" and implement it.
Document your work in TASKS.md

Current Task
------------
Add registration with email/password.
