Dim oWsh, ArgObj, command
Set ArgObj = WScript.Arguments

ip = ArgObj(0)
output = ArgObj(1)

command = "%comspec% /c tracert.exe -h 10 " & ip & " > " & chr(34) & output & chr(34)

set oWsh = WScript.CreateObject ( "Wscript.Shell" )
oWsh.Run command, 0, true


