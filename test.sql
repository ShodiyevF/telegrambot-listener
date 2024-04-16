create database testbot;

create table messages(
    msg_id serial,
    msg_chanel_id int,
    msg_group_id int,
    msg_update_id text
);

create table lastUpdate(
    update_id text
);
