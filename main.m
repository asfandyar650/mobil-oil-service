#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate, WKUIDelegate, WKNavigationDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@property (strong, nonatomic) NSTask *pythonTask;
@property (nonatomic) NSInteger serverPort;
@end

@implementation AppDelegate

- (BOOL)isPortOpen:(NSInteger)port {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return NO;
    
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    
    struct timeval timeout;
    timeout.tv_sec = 0;
    timeout.tv_usec = 250000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (char *)&timeout, sizeof(timeout));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (char *)&timeout, sizeof(timeout));
    
    int result = connect(sock, (struct sockaddr *)&addr, sizeof(addr));
    close(sock);
    return (result == 0);
}

- (void)startPythonBackend {
    self.serverPort = 5055;
    
    if ([self isPortOpen:self.serverPort]) {
        NSLog(@"[Desktop App] Backend already running on port %ld", (long)self.serverPort);
        return;
    }
    
    NSBundle *bundle = [NSBundle mainBundle];
    NSString *appPyPath = [bundle pathForResource:@"app" ofType:@"py"];
    NSString *workDir = nil;
    
    if (appPyPath) {
        workDir = [bundle resourcePath];
    } else {
        NSString *currentDir = [[NSFileManager defaultManager] currentDirectoryPath];
        NSString *candidate = [currentDir stringByAppendingPathComponent:@"app.py"];
        if ([[NSFileManager defaultManager] fileExistsAtPath:candidate]) {
            appPyPath = candidate;
            workDir = currentDir;
        } else {
            NSString *execDir = [[[bundle bundlePath] stringByDeletingLastPathComponent] stringByStandardizingPath];
            candidate = [execDir stringByAppendingPathComponent:@"app.py"];
            if ([[NSFileManager defaultManager] fileExistsAtPath:candidate]) {
                appPyPath = candidate;
                workDir = execDir;
            }
        }
    }
    
    if (!appPyPath) {
        NSLog(@"[Desktop App] Error: app.py not found!");
        return;
    }
    
    NSLog(@"[Desktop App] Starting backend: %@ in %@", appPyPath, workDir);
    self.pythonTask = [[NSTask alloc] init];
    self.pythonTask.launchPath = @"/usr/bin/python3";
    self.pythonTask.arguments = @[appPyPath];
    if (workDir) {
        self.pythonTask.currentDirectoryPath = workDir;
    }
    
    // Pipe standard error to prevent hangs
    NSPipe *pipe = [NSPipe pipe];
    self.pythonTask.standardError = pipe;
    
    [self.pythonTask launch];
    
    // Wait for server to respond (up to 5 seconds)
    for (int i = 0; i < 25; i++) {
        usleep(200000); // 200ms
        if ([self isPortOpen:self.serverPort]) {
            NSLog(@"[Desktop App] Backend listening on port %ld", (long)self.serverPort);
            break;
        }
    }
}

- (void)setupMenus {
    NSMenu *menubar = [[NSMenu alloc] init];
    
    // App Menu
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:appMenuItem];
    NSMenu *appMenu = [[NSMenu alloc] init];
    
    NSString *appName = @"Mobil Oil Service";
    NSMenuItem *aboutItem = [[NSMenuItem alloc] initWithTitle:[NSString stringWithFormat:@"About %@", appName]
                                                       action:@selector(showAboutDialog:)
                                                keyEquivalent:@""];
    [appMenu addItem:aboutItem];
    [appMenu addItem:[NSMenuItem separatorItem]];
    
    NSMenuItem *hideItem = [[NSMenuItem alloc] initWithTitle:[NSString stringWithFormat:@"Hide %@", appName]
                                                      action:@selector(hide:)
                                               keyEquivalent:@"h"];
    [appMenu addItem:hideItem];
    
    NSMenuItem *hideOthersItem = [[NSMenuItem alloc] initWithTitle:@"Hide Others"
                                                            action:@selector(hideOtherApplications:)
                                                     keyEquivalent:@"h"];
    [hideOthersItem setKeyEquivalentModifierMask:(NSEventModifierFlagOption | NSEventModifierFlagCommand)];
    [appMenu addItem:hideOthersItem];
    
    NSMenuItem *showAllItem = [[NSMenuItem alloc] initWithTitle:@"Show All"
                                                         action:@selector(unhideAllApplications:)
                                                  keyEquivalent:@""];
    [appMenu addItem:showAllItem];
    [appMenu addItem:[NSMenuItem separatorItem]];
    
    NSMenuItem *quitItem = [[NSMenuItem alloc] initWithTitle:[NSString stringWithFormat:@"Quit %@", appName]
                                                      action:@selector(terminate:)
                                               keyEquivalent:@"q"];
    [appMenu addItem:quitItem];
    [appMenuItem setSubmenu:appMenu];
    
    // File Menu
    NSMenuItem *fileMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:fileMenuItem];
    NSMenu *fileMenu = [[NSMenu alloc] initWithTitle:@"File"];
    
    NSMenuItem *printItem = [[NSMenuItem alloc] initWithTitle:@"Print Receipt / Sticker..."
                                                       action:@selector(printDocument:)
                                                keyEquivalent:@"p"];
    [fileMenu addItem:printItem];
    
    [fileMenu addItem:[NSMenuItem separatorItem]];
    
    NSMenuItem *closeItem = [[NSMenuItem alloc] initWithTitle:@"Close Window"
                                                       action:@selector(performClose:)
                                                keyEquivalent:@"w"];
    [fileMenu addItem:closeItem];
    [fileMenuItem setSubmenu:fileMenu];
    
    // Edit Menu
    NSMenuItem *editMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:editMenuItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Edit"];
    
    [editMenu addItemWithTitle:@"Undo" action:@selector(undo:) keyEquivalent:@"z"];
    [editMenu addItemWithTitle:@"Redo" action:@selector(redo:) keyEquivalent:@"Z"];
    [editMenu addItem:[NSMenuItem separatorItem]];
    [editMenu addItemWithTitle:@"Cut" action:@selector(cut:) keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"Copy" action:@selector(copy:) keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"Paste" action:@selector(paste:) keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"Select All" action:@selector(selectAll:) keyEquivalent:@"a"];
    [editMenuItem setSubmenu:editMenu];
    
    // View Menu
    NSMenuItem *viewMenuItem = [[NSMenuItem alloc] init];
    [menubar addItem:viewMenuItem];
    NSMenu *viewMenu = [[NSMenu alloc] initWithTitle:@"View"];
    
    NSMenuItem *reloadItem = [[NSMenuItem alloc] initWithTitle:@"Reload"
                                                        action:@selector(reloadPage:)
                                                 keyEquivalent:@"r"];
    [viewMenu addItem:reloadItem];
    
    [viewMenu addItem:[NSMenuItem separatorItem]];
    
    NSMenuItem *zoomInItem = [[NSMenuItem alloc] initWithTitle:@"Actual Size"
                                                        action:@selector(resetZoom:)
                                                 keyEquivalent:@"0"];
    [viewMenu addItem:zoomInItem];
    
    NSMenuItem *fullScreenItem = [[NSMenuItem alloc] initWithTitle:@"Toggle Full Screen"
                                                            action:@selector(toggleFullScreen:)
                                                     keyEquivalent:@"f"];
    [fullScreenItem setKeyEquivalentModifierMask:(NSEventModifierFlagControl | NSEventModifierFlagCommand)];
    [viewMenu addItem:fullScreenItem];
    [viewMenuItem setSubmenu:viewMenu];
    
    [NSApp setMainMenu:menubar];
}

- (void)showAboutDialog:(id)sender {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Mobil Oil Change Service";
    alert.informativeText = @"Automotive Quick Lube & POS Desktop Management System\n\nVersion 1.0.0 (Apple Silicon Native)\nLocal SQLite Storage | Auto Thermal Receipts | Profit Tracking";
    [alert addButtonWithTitle:@"OK"];
    [alert runModal];
}

- (void)reloadPage:(id)sender {
    [self.webView reload];
}

- (void)resetZoom:(id)sender {
    self.webView.pageZoom = 1.0;
}

- (void)printDocument:(id)sender {
    if (@available(macOS 11.0, *)) {
        NSPrintInfo *printInfo = [NSPrintInfo sharedPrintInfo];
        printInfo.horizontalPagination = NSPrintingPaginationModeFit;
        printInfo.verticalPagination = NSPrintingPaginationModeFit;
        
        NSPrintOperation *op = [self.webView printOperationWithPrintInfo:printInfo];
        op.showsPrintPanel = YES;
        [op runOperationModalForWindow:self.window delegate:nil didRunSelector:nil contextInfo:nil];
    }
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    [self setupMenus];
    
    // Start backend server
    [self startPythonBackend];
    
    // Window configuration
    NSRect screenRect = [[NSScreen mainScreen] visibleFrame];
    CGFloat width = MIN(1340, screenRect.size.width * 0.94);
    CGFloat height = MIN(900, screenRect.size.height * 0.94);
    NSRect windowRect = NSMakeRect((screenRect.size.width - width) / 2 + screenRect.origin.x,
                                   (screenRect.size.height - height) / 2 + screenRect.origin.y,
                                   width, height);
    
    NSWindowStyleMask styleMask = NSWindowStyleMaskTitled |
                                  NSWindowStyleMaskClosable |
                                  NSWindowStyleMaskMiniaturizable |
                                  NSWindowStyleMaskResizable;
    
    self.window = [[NSWindow alloc] initWithContentRect:windowRect
                                              styleMask:styleMask
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.title = @"Mobil Oil Service - Quick Lube & POS Management";
    self.window.minSize = NSMakeSize(960, 600);
    [self.window setFrameAutosaveName:@"MobilOilServiceWindow"];
    self.window.delegate = self;
    
    // Configure WebKit WebView
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];
    
    self.webView = [[WKWebView alloc] initWithFrame:self.window.contentView.bounds configuration:config];
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webView.UIDelegate = self;
    self.webView.navigationDelegate = self;
    
    [self.window.contentView addSubview:self.webView];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
    
    // Load local application
    NSString *urlString = [NSString stringWithFormat:@"http://127.0.0.1:%ld", (long)self.serverPort];
    NSURL *url = [NSURL URLWithString:urlString];
    NSURLRequest *request = [NSURLRequest requestWithURL:url];
    [self.webView loadRequest:request];
}

// Support JS Alert
- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(void))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Mobil Oil Service";
    alert.informativeText = message;
    [alert addButtonWithTitle:@"OK"];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse returnCode) {
        completionHandler();
    }];
}

// Support JS Confirm
- (void)webView:(WKWebView *)webView runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL result))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Confirm Action";
    alert.informativeText = message;
    [alert addButtonWithTitle:@"OK"];
    [alert addButtonWithTitle:@"Cancel"];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse returnCode) {
        completionHandler(returnCode == NSAlertFirstButtonReturn);
    }];
}

// Support JS Prompt
- (void)webView:(WKWebView *)webView runJavaScriptTextInputPanelWithPrompt:(NSString *)prompt defaultText:(NSString *)defaultText initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(NSString * _Nullable result))completionHandler {
    completionHandler(nil);
}

// Quit on window close
- (BOOL)windowShouldClose:(NSWindow *)sender {
    [NSApp terminate:nil];
    return YES;
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
    if (self.pythonTask && [self.pythonTask isRunning]) {
        NSLog(@"[Desktop App] Terminating backend server process...");
        [self.pythonTask terminate];
        [self.pythonTask waitUntilExit];
    }
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}
