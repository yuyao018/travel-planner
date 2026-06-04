import pytest
import os
from datetime import datetime

try:
    import pytest_html
except ImportError:
    pytest_html = None

# This hook allows us to add extra content to the HTML report
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    
    if pytest_html is None:
        return

    extra = getattr(report, "extra", [])

    if report.when == "call":
        # Always check for a 'driver' fixture in the test item
        driver = item.funcargs.get("driver")
        if driver:
            # Create screenshots directory if it doesn't exist
            SCREENSHOT_DIR = "screenshots"
            if not os.path.exists(SCREENSHOT_DIR):
                os.makedirs(SCREENSHOT_DIR)

            # Take a screenshot for the report
            timestamp = datetime.now().strftime("%H%M%S")
            screenshot_name = f"{item.name}_{timestamp}.png"
            screenshot_path = os.path.join(SCREENSHOT_DIR, screenshot_name)
            driver.save_screenshot(screenshot_path)
            
            # Embed the screenshot in the HTML report
            # We use a relative path for the HTML report to find the image
            if screenshot_path:
                html = '<div><img src="%s" alt="screenshot" style="width:304px;height:228px;" ' \
                       'onclick="window.open(this.src)" align="right"/></div>' % screenshot_path
                extra.append(pytest_html.extras.html(html))
    report.extra = extra

# Note: For multiple screenshots per test, we rely on the log output 
# or custom extra.append calls within the test functions themselves.
