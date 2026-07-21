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
Consultants shall be able to view and edit their offered session for students. A consultant can only have a single session.
The session has a title and a short description.
The consultant can perform his session multiple times (at least once), so he can select from a range of time slots. At least one must be selected. Use these slots:

    Vor Ort im DFG/LFA / sur place um / à 
        ☐ 13h30 
        ☐ 14h30 
        ☐ 15h30
        ☐ 16h30

    Per Videokonferenz / Par visioconférence um / à 
        ☐ 13h30 
        ☐ 14h30 
        ☐ 15h30
        ☐ 16h30

    Anschließende Ansprachen und Apéro /Discours, suivis du verre de l’amitié
        ☐ 17h45

Furthermore, add these checkboxes to the profile view.

☐ J’autorise l'utilisation de mes textes et de ma photo sur des affiches exposées au LFA lors de l'événement. / Ich bin damit einverstanden, dass meine Texte und mein Foto am Veranstaltungstag auf Plakaten im DFG ausgestellt werden.

☐ J’autorise la transmission et l'enregistrement de mes données sur le site www.alumni-dfglfa.net de l’Association des Amis du LFA de Fribourg. / Ich bin damit einverstanden, dass meine Daten für www.alumni-dfglfa.net des Vereins der Freunde und Förderer des DFG e.V. weitergegeben und gespeichert werden.



