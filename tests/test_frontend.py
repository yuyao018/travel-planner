import pytest
import logging
import sys
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
import time

# Configuration
BASE_URL = "http://localhost:5173"
TEST_EMAIL = "test@gmail.com"
TEST_PASSWORD = "P@ssw0rd!"
# Generate a unique trip name for this session to avoid conflicts with previous runs
SESSION_ID = datetime.now().strftime("%H%M%S")
TRIP_NAME = f"Summer Vacation {SESSION_ID}"
TRIP_DESTINATION = "Paris, France"

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create screenshots directory
SCREENSHOT_DIR = "screenshots"
if not os.path.exists(SCREENSHOT_DIR):
    os.makedirs(SCREENSHOT_DIR)

def set_input_value(driver, element, value):
    """Helper to set input value via JavaScript bypassing React's internal tracking if necessary."""
    driver.execute_script(
        "var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; "
        "nativeInputValueSetter.call(arguments[0], arguments[1]); "
        "arguments[0].dispatchEvent(new Event('input', { bubbles: true })); "
        "arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
        element, value
    )

def type_into_input(driver, element, value):
    """Helper to type into a React controlled text input reliably.
    Clicks to focus, selects all existing text, then types the new value."""
    ActionChains(driver).click(element).key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL).perform()
    element.send_keys(value)

def take_screenshot(driver, name):
    """Helper to take a full-page screenshot and log it."""
    # Wait for page to stabilize
    time.sleep(1.5)
    
    # Use a fixed desktop-like width so the layout renders correctly,
    # and expand height to capture the full page without scrolling
    SCREENSHOT_WIDTH = 1440
    total_height = driver.execute_script("return document.body.parentNode.scrollHeight")
    
    # Save original size
    original_size = driver.get_window_size()
    
    # Resize to full page at proper width
    driver.set_window_size(SCREENSHOT_WIDTH, max(total_height, 900))
    time.sleep(0.5) # Allow UI to reflow at new size
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name}_{timestamp}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    driver.save_screenshot(filepath)
    logger.info(f"Full-page screenshot saved: {filepath}")
    
    # Restore original size
    driver.set_window_size(original_size['width'], original_size['height'])
    return filepath

@pytest.fixture(scope="module")
def driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1440,900")
    # Enable browser logging
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(10)
    yield driver
    
    # Capture browser logs on teardown
    print("\n--- Browser Console Logs ---")
    for entry in driver.get_log('browser'):
        print(f"{entry['level']}: {entry['message']}")
    
    driver.quit()

def test_landing_page(driver):
    """Verify landing page loads and 'Get Started' button works."""
    logger.info("Navigating to landing page")
    driver.get(BASE_URL)
    take_screenshot(driver, "landing_page")
    
    # Check for logo or hero text
    hero_text = driver.find_element(By.CLASS_NAME, "hero-heading")
    logger.info(f"Hero text found: {hero_text.text.replace('\n', ' ')}")
    assert "Explore" in hero_text.text
    
    # Click 'Get Started'
    logger.info("Clicking 'Get Started' button")
    get_started_btn = driver.find_element(By.CLASS_NAME, "btn-get-started-nav")
    get_started_btn.click()
    
    # Verify we are on the sign-in page
    logger.info("Waiting for Sign In page")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h2[text()='Sign In']"))
    )
    take_screenshot(driver, "signin_page")
    assert "Sign In" in driver.page_source

def test_login(driver):
    """Verify login functionality."""
    # If we're not already on the sign-in page, go there
    if "Sign In" not in driver.page_source:
        logger.info("Not on sign-in page, navigating back")
        driver.get(f"{BASE_URL}")
        driver.find_element(By.CLASS_NAME, "btn-get-started-nav").click()

    logger.info(f"Attempting login with email: {TEST_EMAIL}")
    # Find email and password inputs
    email_input = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
    password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    
    email_input.send_keys(TEST_EMAIL)
    password_input.send_keys(TEST_PASSWORD)
    take_screenshot(driver, "login_filled")
    
    # Click submit
    logger.info("Submitting login form")
    submit_btn = driver.find_element(By.CSS_SELECTOR, "button.btn")
    submit_btn.click()
    
    # Wait for dashboard to load
    logger.info("Waiting for dashboard to load")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    # Ensure loading is finished before asserting
    logger.info("Waiting for 'Loading...' state to finish")
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    take_screenshot(driver, "dashboard_loaded")
    assert "Travel Planner" in driver.page_source

def test_add_trip(driver):
    """Verify adding a new trip."""
    logger.info("Starting 'Add Trip' flow")
    # Click 'Add Trip' button
    add_trip_btn = driver.find_element(By.CLASS_NAME, "btn-add-trip")
    add_trip_btn.click()
    
    # Wait for Add Trip form
    logger.info("Waiting for Add Trip form")
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.ID, "destination"))
    )
    take_screenshot(driver, "add_trip_form")
    
    # Fill out the form
    logger.info(f"Filling out trip details for {TRIP_NAME}")
    trip_name_input = driver.find_element(By.NAME, "tripName")
    type_into_input(driver, trip_name_input, TRIP_NAME)
    
    dest_input = driver.find_element(By.NAME, "destination")
    dest_input.clear()
    dest_input.send_keys(TRIP_DESTINATION)
    time.sleep(1) # Wait for autocomplete
    dest_input.send_keys(Keys.ESCAPE) # Close autocomplete
    
    # Robust date entry for <input type="date"> using JavaScript for reliability
    # Format YYYY-MM-DD is the standard for the .value property of date inputs
    start_date_input = driver.find_element(By.NAME, "startDate")
    logger.info("Setting startDate to 2026-07-01")
    set_input_value(driver, start_date_input, "2026-07-01")
    
    end_date_input = driver.find_element(By.NAME, "endDate")
    logger.info("Setting endDate to 2026-07-10")
    set_input_value(driver, end_date_input, "2026-07-10")
    
    budget_input = driver.find_element(By.NAME, "budget")
    budget_input.clear()
    budget_input.send_keys("2000")

    # Logistics & Accommodation
    logger.info("Filling out logistics and hotel details")
    # Arrival Time: 8:00 AM (08:00)
    arrival_time_input = driver.find_element(By.NAME, "arrivalTime")
    set_input_value(driver, arrival_time_input, "08:00")

    # Arrival Airport
    arrival_airport_input = driver.find_element(By.NAME, "arrivalAirport")
    arrival_airport_input.clear()
    arrival_airport_input.send_keys("Charles de Gaulle Airport")
    time.sleep(1)
    arrival_airport_input.send_keys(Keys.ESCAPE)

    # Departure Time: 8:00 PM (20:00)
    departure_time_input = driver.find_element(By.NAME, "departure_time" if "departure_time" in driver.page_source else "departureTime")
    set_input_value(driver, departure_time_input, "20:00")

    # Departure Airport
    departure_airport_input = driver.find_element(By.NAME, "departureAirport")
    departure_airport_input.clear()
    departure_airport_input.send_keys("Charles de Gaulle Airport")
    time.sleep(1)
    departure_airport_input.send_keys(Keys.ESCAPE)

    # Hotel Check-in: Start Date (July 1, 2026) at 9:30 AM
    hotel_checkin_input = driver.find_element(By.NAME, "hotelCheckIn")
    set_input_value(driver, hotel_checkin_input, "2026-07-01T09:30")

    # Hotel Name
    driver.find_element(By.NAME, "hotelLocation").send_keys("Pullman Paris Tour Eiffel")

    # Hotel Check-out: End Date (July 10, 2026) at 6:00 PM (18:00)
    hotel_checkout_input = driver.find_element(By.NAME, "hotelCheckOut")
    set_input_value(driver, hotel_checkout_input, "2026-07-10T18:00")
    
    # Select preferences
    try:
        logger.info("Selecting preferences")
        food_tag = driver.find_element(By.XPATH, "//div[contains(@class, 'tag-pill') and text()='Food']")
        food_tag.click()
        adventure_tag = driver.find_element(By.XPATH, "//div[contains(@class, 'tag-pill') and text()='Adventure']")
        adventure_tag.click()
    except Exception as e:
        logger.warning(f"Could not click tag pills: {e}")

    # Capture the full addTrip page before submitting
    take_screenshot(driver, "addTrip_page")

    # Submit the form
    logger.info("Submitting trip form")
    submit_btn = driver.find_element(By.CLASS_NAME, "btn-submit")
    driver.execute_script("arguments[0].scrollIntoView(true);", submit_btn)
    time.sleep(0.5) # Brief pause for UI to settle
    submit_btn.click()
    
    # Check for any immediate form errors
    try:
        error_msg = driver.find_element(By.CLASS_NAME, "form-error")
        if error_msg.is_displayed():
            logger.error(f"Form submission error detected: {error_msg.text}")
            take_screenshot(driver, "add_trip_error")
    except:
        pass # No error message found

    # Wait to return to dashboard - increased timeout for geocoding
    logger.info("Waiting to return to dashboard (allowing time for geocoding)")
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    
    # Wait for the "Loading..." state to disappear to ensure trips are fetched
    logger.info("Waiting for trips to fetch")
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    
    # Wait for the specific trip name to appear in the list
    logger.info(f"Verifying new trip {TRIP_NAME} appears in list")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-name') and text()='{TRIP_NAME}']"))
    )
    
    take_screenshot(driver, "dashboard_with_new_trip")
    # Final verification
    assert TRIP_NAME in driver.page_source
    assert TRIP_DESTINATION in driver.page_source

def test_plan_view(driver):
    """Verify PlanView page loads and displays trip details."""
    logger.info("Starting 'Plan View' test")
    
    # We should be on the dashboard. Find the trip we just created.
    logger.info(f"Finding trip card for {TRIP_NAME}")
    trip_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    
    # Click to enter PlanView
    logger.info("Clicking trip card to enter Plan View")
    trip_card.click()
    
    # Wait for PlanView to load
    logger.info("Waiting for Plan View to load")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "plan-container"))
    )
    
    # Ensure loading is finished
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "loading-screen"))
    )
    
    # Take a screenshot of the PlanView page
    take_screenshot(driver, "plan_view_page")
    
    # Verify elements in PlanView
    logger.info("Verifying Plan View content")
    # Wait for trip name to appear in the DOM (more reliable than page_source check)
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{TRIP_NAME}')]"))
    )
    assert TRIP_NAME in driver.page_source
    assert TRIP_DESTINATION in driver.page_source
    
    # Go back to home
    logger.info("Navigating back to home")
    back_btn = driver.find_element(By.CLASS_NAME, "back-link")
    # Use JS click to avoid href="#" interfering with React's onClick in headless mode
    driver.execute_script("arguments[0].click();", back_btn)
    
    # Wait for dashboard to be present and trips to be loaded
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    # Confirm the trip card is visible on the dashboard before handing off
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']"))
    )

def test_delete_trip(driver):
    """Verify deleting a trip."""
    logger.info("Starting 'Delete Trip' test")
    
    # Ensure we are on the dashboard with trips loaded
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    
    # We should be on the dashboard. Find the trip we created.
    logger.info(f"Finding trip card for {TRIP_NAME} to delete")
    trip_card = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    
    # Find and click the edit button inside this specific trip card
    logger.info("Clicking edit button on the trip card")
    edit_btn = trip_card.find_element(By.CLASS_NAME, "btn-edit-trip")
    edit_btn.click()
    
    # Wait for Edit Trip page to load
    logger.info("Waiting for Edit Trip page to load")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "edit-trip-header"))
    )
    take_screenshot(driver, "edit_trip_page_before_delete")
    
    # Click the delete button
    logger.info("Clicking delete button in Edit Trip page")
    delete_btn = driver.find_element(By.CLASS_NAME, "btn-delete-trip")
    delete_btn.click()
    
    # Handle the confirmation alert
    logger.info("Handling deletion confirmation alert")
    WebDriverWait(driver, 5).until(EC.alert_is_present())
    alert = driver.switch_to.alert
    logger.info(f"Alert text: {alert.text}")
    alert.accept()
    
    # Wait to return to dashboard
    logger.info("Waiting to return to dashboard after deletion")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    
    # Wait for the "Loading..." state to disappear to ensure trips are refreshed
    logger.info("Waiting for trips to refresh")
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    
    # Verify the trip is no longer in the page source
    logger.info("Verifying trip is deleted from dashboard")
    # Wait for the specific trip name to disappear from the DOM
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.XPATH, f"//*[text()='{TRIP_NAME}']"))
    )
    assert TRIP_NAME not in driver.page_source
    take_screenshot(driver, "dashboard_after_deletion")

def test_logout(driver):
    """Verify logout functionality."""
    logger.info("Attempting logout")
    
    # Ensure we are on the dashboard/homepage before logging out
    logger.info("Navigating back to home before logout")
    driver.get(BASE_URL)
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )

    # Find logout button (user profile circle)
    logout_btn = driver.find_element(By.CLASS_NAME, "user-profile-circle")
    logout_btn.click()
    
    # Verify we are back on the landing page
    logger.info("Verifying redirection to landing page")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "travel-hero"))
    )
    take_screenshot(driver, "after_logout")
    assert "Explore" in driver.page_source
