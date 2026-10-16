"""Contact sheet of ACTUAL Chrome screenshot files only, not generated face imagery."""
from PIL import Image,ImageDraw
from pathlib import Path
p=Path('artifacts/hero-v5-einar')
views=['front','three_quarter','profile','eyes_macro','eyes_three_quarter']
width=960;height=760;title=44
sheet=Image.new('RGB',(width*2,(height+title)*3),'#20242b')
for i,v in enumerate(views):
 with Image.open(p/('blank-webgl-'+v+'.png')) as im:
  pic=im.convert('RGB')
  if pic.size!=(width,height):raise ValueError('Unexpected screenshot resolution '+v+str(pic.size))
  x=(i%2)*width;y=(i//2)*(height+title)
  sheet.paste(pic,(x,y+title))
  ImageDraw.Draw(sheet).text((x+15,y+14),"BLANK ENGINE REAL WEBGL | "+v,fill='white')
sheet.save(p/'blank-webgl-contact-sheet.jpg',quality=85,optimize=True)
print('BLANK_ENGINE_CHROME_CONTACT_SHEET',str(p/'blank-webgl-contact-sheet.jpg'))
