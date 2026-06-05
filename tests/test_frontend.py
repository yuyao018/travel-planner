import pytest
import logging
import sys
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
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
    
    # Final verification
    assert TRIP_NAME in driver.page_source
    assert TRIP_DESTINATION in driver.page_source

def test_edit_trip(driver):
    """Verify editing a trip name and saving the changes."""
    logger.info("Starting 'Edit Trip' test")

    # Ensure we are on the dashboard with trips loaded
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )

    # Find the trip card for the trip we just created
    logger.info(f"Finding trip card for {TRIP_NAME}")
    trip_card = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )

    # Click the edit button on that trip card
    logger.info("Clicking edit button on the trip card")
    edit_btn = trip_card.find_element(By.CLASS_NAME, "btn-edit-trip")
    edit_btn.click()

    # Wait for the Edit Trip page to load
    logger.info("Waiting for Edit Trip page to load")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "edit-trip-header"))
    )

    # Update the trip name
    edited_trip_name = f"{TRIP_NAME} (Edited)"
    logger.info(f"Changing trip name to: {edited_trip_name}")
    trip_name_input = driver.find_element(By.NAME, "tripName")
    type_into_input(driver, trip_name_input, edited_trip_name)

    # Submit / save the changes
    logger.info("Saving the edited trip")
    save_btn = driver.find_element(By.CLASS_NAME, "btn-submit")
    driver.execute_script("arguments[0].scrollIntoView(true);", save_btn)
    time.sleep(0.5)
    save_btn.click()

    # Wait to return to dashboard
    logger.info("Waiting to return to dashboard after edit")
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )

    # Verify the updated trip name appears on the dashboard
    logger.info(f"Verifying updated trip name '{edited_trip_name}' appears on dashboard")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-name') and text()='{edited_trip_name}']"))
    )
    assert edited_trip_name in driver.page_source


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
    
    # Verify elements in PlanView
    # Note: trip name was updated by test_edit_trip, so check for the edited name
    edited_trip_name = f"{TRIP_NAME} (Edited)"
    logger.info("Verifying Plan View content")
    # Wait for trip name to appear in the DOM (more reliable than page_source check)
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{edited_trip_name}')]"))
    )
    assert edited_trip_name in driver.page_source
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

def test_search_add_stop(driver):
    """Verify searching for a place, adding it as a stop, editing the stop details, then deleting it."""
    logger.info("Starting 'Search Add Stop' test")

    # Navigate into the plan view for our trip
    logger.info(f"Finding trip card for {TRIP_DESTINATION} to enter Plan View")
    trip_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    trip_card.click()

    # Wait for Plan View to fully load
    logger.info("Waiting for Plan View to load")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "plan-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "loading-screen"))
    )

    # ── Step 1: Search for "restaurant" ────────────────────────────────────────
    logger.info("Searching for 'restaurant' in the Discover Nearby Places search bar")
    search_input = driver.find_element(By.CSS_SELECTOR, ".places-search-form input[type='text']")
    type_into_input(driver, search_input, "restaurant")

    search_btn = driver.find_element(By.CSS_SELECTOR, ".places-search-form button[type='submit']")
    search_btn.click()

    # Wait for results to appear
    logger.info("Waiting for places search results")
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CLASS_NAME, "place-item"))
    )

    # ── Step 2: Select the first result and click the plus icon ───────────────
    logger.info("Clicking the '+' button on the first search result")
    first_add_btn = driver.find_element(By.CSS_SELECTOR, ".place-item .btn-add-place")
    # Capture the name of the place being added for later verification
    first_place_name = driver.find_element(By.CSS_SELECTOR, ".place-item .place-name").text
    logger.info(f"Adding place: {first_place_name}")
    first_add_btn.click()

    # Wait for the stop to appear in the timeline (results grid clears on add)
    logger.info("Waiting for stop to appear in the timeline")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CLASS_NAME, "timeline-item"))
    )

    # ── Step 3: Click the edit (pencil) icon on the newly added stop ──────────
    logger.info("Clicking the edit icon on the newly added stop")
    # The most recently added stop will be the last timeline item for the active day
    stop_cards = driver.find_elements(By.CLASS_NAME, "stop-card")
    # Find the stop card whose title contains the place name we added
    edit_btn = None
    for card in stop_cards:
        try:
            if first_place_name in card.find_element(By.TAG_NAME, "h4").text:
                edit_btn = card.find_element(By.CLASS_NAME, "btn-edit-stop")
                break
        except Exception:
            continue
    if edit_btn is None:
        # Fallback: use the last edit button in the timeline
        logger.warning("Could not match stop by name, using last edit button as fallback")
        edit_btn = driver.find_elements(By.CLASS_NAME, "btn-edit-stop")[-1]

    driver.execute_script("arguments[0].scrollIntoView(true);", edit_btn)
    edit_btn.click()

    # Wait for the stop form overlay to appear
    logger.info("Waiting for stop edit form to appear")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "stop-form-overlay"))
    )

    # ── Step 4: Set time to 10:00 AM ──────────────────────────────────────────
    logger.info("Setting stop time to 10:00")
    time_input = driver.find_element(By.CSS_SELECTOR, ".stop-form input[name='time']")
    set_input_value(driver, time_input, "10:00")

    # ── Step 5: Set duration to 1h (hours=1, minutes=0) ───────────────────────
    logger.info("Setting duration to 1h (hours=1, minutes=0)")
    duration_hours_select = Select(driver.find_element(By.CSS_SELECTOR, ".stop-form select[name='durationHours']"))
    duration_hours_select.select_by_value("1")

    duration_minutes_select = Select(driver.find_element(By.CSS_SELECTOR, ".stop-form select[name='durationMinutes']"))
    duration_minutes_select.select_by_value("0")


    # ── Step 6: Click "Update Stop" ───────────────────────────────────────────
    logger.info("Clicking 'Update Stop' button")
    update_btn = driver.find_element(By.CLASS_NAME, "btn-save-stop")
    driver.execute_script("arguments[0].scrollIntoView(true);", update_btn)
    time.sleep(0.5)
    update_btn.click()

    # Wait for the form to close and timeline to refresh
    logger.info("Waiting for stop form to close after update")
    WebDriverWait(driver, 15).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "stop-form-overlay"))
    )

    # Verify the stop now shows 10:00 in the timeline
    logger.info("Verifying updated time '10:00' appears on the stop in the timeline")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(@class, 'timeline-left') and contains(text(), '10:00')]"))
    )
    assert "10:00" in driver.page_source

    # ── Step 7: Delete the stop ───────────────────────────────────────────────
    logger.info("Clicking the delete icon on the updated stop")
    stop_cards = driver.find_elements(By.CLASS_NAME, "stop-card")
    delete_btn = None
    for card in stop_cards:
        try:
            if first_place_name in card.find_element(By.TAG_NAME, "h4").text:
                delete_btn = card.find_element(By.CLASS_NAME, "btn-delete-stop")
                break
        except Exception:
            continue
    if delete_btn is None:
        logger.warning("Could not match stop by name for deletion, using last delete button as fallback")
        delete_btn = driver.find_elements(By.CLASS_NAME, "btn-delete-stop")[-1]

    driver.execute_script("arguments[0].scrollIntoView(true);", delete_btn)
    delete_btn.click()

    # Handle the confirmation alert
    logger.info("Confirming stop deletion alert")
    WebDriverWait(driver, 5).until(EC.alert_is_present())
    alert = driver.switch_to.alert
    logger.info(f"Alert text: {alert.text}")
    alert.accept()

    # Wait for the stop to disappear from the timeline
    logger.info("Waiting for stop to be removed from the timeline")
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.XPATH, f"//*[contains(@class, 'stop-card')]//h4[contains(text(), '{first_place_name}')]"))
    )
    assert first_place_name not in driver.page_source

    # Navigate back to dashboard so the next test starts from a known state
    logger.info("Navigating back to dashboard after stop test")
    back_btn = driver.find_element(By.CLASS_NAME, "back-link")
    driver.execute_script("arguments[0].click();", back_btn)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']"))
    )


def test_AI_generate_itinerary(driver):
    """Verify the AI Generate button produces an itinerary for the trip."""
    logger.info("Starting 'AI Generate Itinerary' test")

    # Ensure we are on the dashboard with trips loaded
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )

    # Navigate into Plan View for our trip
    logger.info(f"Opening Plan View for {TRIP_DESTINATION}")
    trip_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    trip_card.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "plan-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "loading-screen"))
    )

    # Click the "AI Generate" button
    logger.info("Clicking 'AI Generate' button")
    ai_generate_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CLASS_NAME, "btn-ai-generate"))
    )
    ai_generate_btn.click()

    # Handle the confirmation dialog before generation starts
    logger.info("Accepting AI generation confirmation dialog")
    WebDriverWait(driver, 5).until(EC.alert_is_present())
    confirm_alert = driver.switch_to.alert
    logger.info(f"Confirm dialog text: {confirm_alert.text}")
    confirm_alert.accept()

    # Wait for the button to enter the "Generating..." state, confirming the request is in-flight
    logger.info("Waiting for 'Generating...' state on button")
    try:
        WebDriverWait(driver, 10).until(
            EC.text_to_be_present_in_element((By.CLASS_NAME, "btn-ai-generate"), "Generating...")
        )
    except Exception:
        # Alert may have already fired before we could catch the transitional state — that's fine
        logger.warning("Could not catch 'Generating...' state — generation may have completed very quickly")

    # AI generation can take a while — wait up to 10 minutes for it to finish.
    # The backend fires a window.alert() when done (success or error), which also
    # causes the button to revert. We wait for the alert directly rather than
    # polling the button text, to avoid UnexpectedAlertPresentException.
    logger.info("Waiting for AI generation result alert (up to 600s)")
    WebDriverWait(driver, 600).until(EC.alert_is_present())

    # Handle the result alert ("AI Itinerary generated successfully!" or an error message)
    logger.info("Handling result alert after AI generation")
    result_alert = driver.switch_to.alert
    alert_text = result_alert.text
    logger.info(f"AI generation result alert: {alert_text}")
    result_alert.accept()

    # Now wait for the button to re-enable (confirms React state has settled)
    WebDriverWait(driver, 15).until(
        EC.text_to_be_present_in_element((By.CLASS_NAME, "btn-ai-generate"), "AI Generate")
    )

    # Assert generation succeeded
    assert "generated successfully" in alert_text.lower(), (
        f"AI generation did not succeed. Alert was: '{alert_text}'"
    )

    # Verify that stops were created in the timeline
    logger.info("Verifying that timeline items were generated")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "timeline-item"))
    )
    timeline_items = driver.find_elements(By.CLASS_NAME, "timeline-item")
    logger.info(f"Timeline contains {len(timeline_items)} stop(s) after AI generation")
    assert len(timeline_items) > 0, "Expected at least one stop to be generated by AI"


    # Navigate back to dashboard so the next test starts from a known state
    logger.info("Navigating back to dashboard after AI generation test")
    back_btn = driver.find_element(By.CLASS_NAME, "back-link")
    driver.execute_script("arguments[0].click();", back_btn)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']"))
    )


def test_add_budget_expense(driver):
    """Verify adding a budget expense: amount 1000, currency EUR, category Food, notes 'world best Croissant'."""
    logger.info("Starting 'Add Budget Expense' test")

    # Ensure we are on the dashboard with trips loaded
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )

    # Navigate into Plan View for our trip
    logger.info(f"Opening Plan View for {TRIP_DESTINATION}")
    trip_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    trip_card.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "plan-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "loading-screen"))
    )

    # ── Scroll expense form into view ─────────────────────────────────────────
    logger.info("Scrolling expense form into view")
    expense_form = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".expense-form"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", expense_form)
    time.sleep(0.5)

    # ── Fill in the expense form ───────────────────────────────────────────────
    logger.info("Filling in expense form: amount=1000, currency=EUR, category=Food, notes='world best Croissant'")

    # Amount — use JS setter for React controlled number input
    amount_input = driver.find_element(By.CSS_SELECTOR, ".expense-form input[type='number']")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", amount_input)
    set_input_value(driver, amount_input, "1000")

    # Currency — first <select> inside .expense-form
    expense_selects = driver.find_elements(By.CSS_SELECTOR, ".expense-form select")
    currency_select = Select(expense_selects[0])
    currency_select.select_by_value("EUR")

    # Category — second <select> inside .expense-form
    category_select = Select(expense_selects[1])
    category_select.select_by_value("Food")

    # Notes — use JS setter for React controlled text input
    notes_input = driver.find_element(By.CSS_SELECTOR, ".expense-form input[type='text']")
    set_input_value(driver, notes_input, "world best Croissant")

    # ── Click the Add button ───────────────────────────────────────────────────
    logger.info("Clicking '+ Add' button to submit expense")
    add_btn = driver.find_element(By.CSS_SELECTOR, ".expense-form button[type='submit']")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_btn)
    time.sleep(0.3)
    add_btn.click()

    # ── Wait for the expense to appear in the Expenses list ───────────────────
    logger.info("Waiting for expense to appear in the Expenses list")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CLASS_NAME, "budget-item"))
    )
    # Specifically wait for our notes text to show up
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(@class, 'expense-notes-tag') and contains(text(), 'world best Croissant')]"))
    )

    # Verify the expense is present in the page
    assert "world best Croissant" in driver.page_source
    logger.info("Budget expense successfully added and verified")

    # Navigate back to dashboard so the next test starts from a known state
    logger.info("Navigating back to dashboard after budget expense test")
    back_btn = driver.find_element(By.CLASS_NAME, "back-link")
    driver.execute_script("arguments[0].click();", back_btn)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']"))
    )


def test_weather_display(driver):
    """Verify weather is displayed in Plan View and on the home dashboard."""
    logger.info("Starting 'Weather Display' test")

    # Ensure we are on the dashboard with trips loaded
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )

    # ── Part 1: Weather in Plan View ──────────────────────────────────────────
    logger.info(f"Opening Plan View for {TRIP_DESTINATION}")
    trip_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    trip_card.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "plan-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "loading-screen"))
    )

    # Wait for the weather chip to appear in the hero banner
    logger.info("Waiting for weather chip to appear in Plan View")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CLASS_NAME, "weather-chip"))
    )

    # Read and log the weather values shown
    temp_el = driver.find_element(By.CSS_SELECTOR, ".weather-chip .temp")
    condition_el = driver.find_element(By.CSS_SELECTOR, ".weather-chip .condition")
    logger.info(f"Plan View weather — temp: {temp_el.text}, condition: {condition_el.text}")

    # Assert meaningful content is present
    assert "°C" in temp_el.text, f"Expected temperature with '°C', got: '{temp_el.text}'"
    assert condition_el.text.strip() != "", "Expected a non-empty weather condition"


    # ── Navigate back to the dashboard ───────────────────────────────────────
    logger.info("Navigating back to dashboard")
    back_btn = driver.find_element(By.CLASS_NAME, "back-link")
    driver.execute_script("arguments[0].click();", back_btn)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-container"))
    )
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.CLASS_NAME, "fallback-state"))
    )

    # ── Part 2: Weather in Home / Dashboard ───────────────────────────────────
    # The first trip is selected by default on load, which triggers a weather fetch.
    # In headless Chrome, ActionChains.move_to_element does NOT reliably fire
    # React's onMouseEnter — dispatch the event via JS instead.
    logger.info(f"Triggering mouseenter on trip card for {TRIP_DESTINATION} to load weather")
    trip_card_home = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(@class, 'trip-card')]//h4[text()='{TRIP_DESTINATION}']/ancestor::div[contains(@class, 'trip-card')]"))
    )
    driver.execute_script(
        "arguments[0].dispatchEvent(new MouseEvent('mouseenter', {bubbles: true, cancelable: true}));",
        trip_card_home
    )

    # Wait for the weather grid to appear inside the weather widget
    logger.info("Waiting for weather grid to appear in dashboard weather widget")
    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CLASS_NAME, "weather-grid"))
    )

    # Read and log all weather items
    weather_items = driver.find_elements(By.CLASS_NAME, "weather-item")
    logger.info(f"Dashboard weather widget shows {len(weather_items)} item(s)")
    for item in weather_items:
        logger.info(f"  Weather item: {item.text.replace(chr(10), ' ')}")

    # Assert we have at least the core weather data items (temp, condition, wind, humidity)
    assert len(weather_items) >= 4, f"Expected at least 4 weather items on dashboard, found {len(weather_items)}"


    # Confirm the weather widget is visible in the page
    assert "weather-grid" in driver.page_source
    logger.info("Weather display verified on both Plan View and dashboard")


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
    logger.info(f"Finding trip card for {TRIP_NAME} (Edited) to delete")
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
    
    # Click the delete button
    logger.info("Clicking delete button in Edit Trip page")
    delete_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CLASS_NAME, "btn-delete-trip"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", delete_btn)
    time.sleep(0.3)
    # window.confirm fires synchronously on click — set up the accept before clicking
    driver.execute_script("window.confirm = function() { return true; };")
    delete_btn.click()
    
    # Wait to return to dashboard (no alert to handle — confirm was pre-accepted via JS)
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
    # Note: the trip was renamed to TRIP_NAME (Edited) by test_edit_trip
    edited_trip_name = f"{TRIP_NAME} (Edited)"
    logger.info("Verifying trip is deleted from dashboard")
    # Wait for the specific trip name to disappear from the DOM
    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located((By.XPATH, f"//*[text()='{edited_trip_name}']"))
    )
    assert edited_trip_name not in driver.page_source

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
    assert "Explore" in driver.page_source
