Architecture
------------
Backend: PHP / Laravel
Frontend: React
Database: PostgreSQL

Purpose
-------
The application shall be a "social platform" where people can participate
in one of two roles: Speakers or students. (An admin role should also exist)

Speakers offer time slots for a certain topic (i.e. a job kind or university studies that they can share information about). Each Speaker will offer only
one topic, but maybe multiple times.

Each topic must also hav a "tag", in order for similar topics to be grouped together.

Students can then give a fixed number of tags they wish to be informed about.Default for now is 6 tags, might be changed later. Out of these 6, they will
get assigned their favourite 4 tags, if possible. 

The result for each student is then a time schedule for his 4 tags.

Both students and Speakers should be able to log on to the platform.

There should be a "preparation phase", a "selection phase" and a "conference phase", which do not overlap. 

During the "preparation phase", students cannot do anything yet, only login. They see a "soon to come" phrase. Speakers can already edit their data.

During the selection phase, students can pick their favourite tags and prioritize them in a list. 

During the "conference phase" students can only view their schedule. 

For the Speakers: During the "preparation phase" and "selection phase" they can change their personal information, their topic and their CV/"about me" page and also a profile picture.

During the "conference phase" the Speakers can only see their time slots with the participants list and the room numbers.

Code Style
----------
Use modern react, e.g. avoid useEffect.

Claude workflow
---------------
Pick the item listed under "current task" and implement it.
Document your work in TASKS.md

Current Task
------------
For speakers, the platform should be invitation-only. Meaning: On the login page, if a speaker switches to registration, her should be offered the possibility to request an invitation, with an email link to the admin email address.
In the admin area, add the possibility to invite a speaker using a form. The form should contain a text area for the invitation email as well as fields firstname, lastname, email. 


