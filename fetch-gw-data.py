import requests, json
import pandas as pd

# Base url for all FPL API endpoints
base_url = 'https://fantasy.premierleague.com/api/'

# Get data from IFL Weekly
getweekly = requests.get(base_url+'leagues-classic/1469735/standings/').json()
gw = getweekly['standings']

# Get data from IFL Yearly
getyearly = requests.get(base_url+'leagues-classic/1469921/standings/').json()
gy = getyearly['standings']

# Get current gameweek
getall = requests.get(base_url+'bootstrap-static/').json()
getgw = pd.json_normalize(getall['events'])
getgwlist = getgw[['name','is_current']]
getcurrentgw = getgwlist[getgwlist["is_current"] == True]
currentgw = getcurrentgw.iloc[0]['name']
cgws = str(currentgw) + " Weekly.json"
cgwy = str(currentgw) + " Yearly.json"

# Put data into pandas for weekly
getweeklytop = pd.json_normalize(gw['results'])
getweeklytopresult = getweeklytop[['rank', 'entry_name', 'player_name', 'event_total']]

# Put data into pandas for yearly
getyearlytop = pd.json_normalize(gy['results'])
getyearlytopresult = getyearlytop[['rank', 'entry_name', 'player_name', 'total']]

# Save to file
getweeklytopresult.to_json(cgws, index=False, indent=4)
getyearlytopresult.to_json(cgwy, index=False, indent=4)
with open ('latestgw.txt', 'w') as file:
  file.write(currentgw)

