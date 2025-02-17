import requests
from bs4 import BeautifulSoup
import re  # Import regex module

# CPC API URL format
CPC_API_URL = "https://www.uspto.gov/web/patents/classification/cpc/html/cpc-{}.html"

def fetch_cpc_title(cpc_code):
    """
    Fetches the title of the CPC code from the USPTO website and extracts only capital letters.
    """
    try:
        url = CPC_API_URL.format(cpc_code.replace("/", "-"))  # Format CPC code for URL
        response = requests.get(url)

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract CPC title from class "class-title"
            title_section = soup.find("div", class_="class-title")

            if title_section:
                full_title = title_section.get_text(strip=True)

                # ✅ Extract only the CAPITAL LETTER words using regex
                capitalized_title = " ".join(re.findall(r'\b[A-Z]+\b', full_title))

                return capitalized_title if capitalized_title else "Title not found"
            else:
                return "Title not found"
        else:
            return "CPC not found"

    except Exception as e:
        return f"Error fetching title: {e}"
