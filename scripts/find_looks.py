import json
import urllib.request

API_KEY = "sk_V2_hgu_kcWURciptPO_RBJbcA0wHXUw1U3Ejm2iUnKADdGxqxIA"
BASE_URL = "https://api.heygen.com/v3/avatars/looks"
targets = ['Annie', 'Sophie', 'Brandon', 'Caroline', 'Luca', 'Nico']
found = {}
next_token = None
page = 0

while True:
    page += 1
    url = f"{BASE_URL}?limit=50"
    if next_token:
        url += f"&next_token={next_token}"
    
    req = urllib.request.Request(url, headers={"x-api-key": API_KEY})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"Error on page {page}: {e}")
        break
    
    looks = data.get('data', [])
    if not looks:
        break
    
    for look in looks:
        name = look.get('name', '')
        for target in targets:
            if target.lower() in name.lower() and target not in found:
                found[target] = {
                    'id': look.get('id'),
                    'name': name,
                    'image_url': look.get('image_url', ''),
                    'gender': look.get('gender', '')
                }
                print(f"FOUND {target}: {name} | ID: {look['id']}")
    
    if len(found) == len(targets):
        print("\nAll avatars found!")
        break
    
    if not data.get('has_more'):
        break
    
    next_token = data.get('next_token')
    if not next_token:
        break
    
    if page > 50:  # Safety limit
        break

print(f"\n--- Results (searched {page} pages) ---")
for target in targets:
    if target in found:
        f = found[target]
        print(f"{target:12} | {f['id']} | {f['name']}")
        print(f"             | {f['image_url'][:100]}")
    else:
        print(f"{target:12} | NOT FOUND")
