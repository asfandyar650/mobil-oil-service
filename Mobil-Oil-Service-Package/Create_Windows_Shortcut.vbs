Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Mobil Oil Service.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
sCurrentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
oLink.TargetPath = sCurrentDir & "\Start_Windows.bat"
oLink.WorkingDirectory = sCurrentDir
oLink.Description = "Mobil Oil Change Service - Desktop POS & Management System"
oLink.WindowStyle = 1
oLink.Save
WScript.Echo "Mobil Oil Service shortcut created on your Desktop!"
