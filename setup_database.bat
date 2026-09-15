@echo off
REM ================================================================
REM Script tao database cho MDM System
REM Chay script nay voi quyen Administrator
REM ================================================================
echo.
echo === MDM Database Setup Script ===
echo.
set /p PGPWD=Nhap mat khau PostgreSQL (user postgres): 
set PGPASSWORD=%PGPWD%

echo.
echo Kiem tra ket noi...
C:\PROGRA~1\PostgreSQL\17\bin\psql.exe -U postgres -p 5432 -c "SELECT 1;" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo THAT BAI: Khong the ket noi. Kiem tra lai mat khau.
    pause
    exit /b 1
)

echo OK - Ket noi thanh cong!
echo.
echo Tao database mdm_db...
C:\PROGRA~1\PostgreSQL\17\bin\psql.exe -U postgres -p 5432 -c "CREATE DATABASE mdm_db;" 2>&1
echo.
echo Tao user mdm_user...
C:\PROGRA~1\PostgreSQL\17\bin\psql.exe -U postgres -p 5432 -c "CREATE USER mdm_user WITH PASSWORD 'mdm_password';" 2>&1
echo.
echo Cap quyen...
C:\PROGRA~1\PostgreSQL\17\bin\psql.exe -U postgres -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE mdm_db TO mdm_user;" 2>&1
C:\PROGRA~1\PostgreSQL\17\bin\psql.exe -U postgres -p 5432 -c "ALTER DATABASE mdm_db OWNER TO mdm_user;" 2>&1
C:\PROGRA~1\PostgreSQL\17\bin\psql.exe -U postgres -p 5432 -d mdm_db -c "GRANT ALL ON SCHEMA public TO mdm_user;" 2>&1
echo.
echo HOAN TAT! Database da duoc tao thanh cong.
echo Ban co the chay backend server ngay bay gio.
pause
