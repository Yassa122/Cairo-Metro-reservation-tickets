-- Insert Roles
INSERT INTO db_sxf5.roles("role")
	VALUES ('user');
INSERT INTO db_sxf5.roles("role")
	VALUES ('admin');
INSERT INTO db_sxf5.roles("role")
	VALUES ('senior');	
-- Set user role as Admin
UPDATE db_sxf5.users
	SET "roleid"=2
	WHERE "email"='desoukya@gmail.com';