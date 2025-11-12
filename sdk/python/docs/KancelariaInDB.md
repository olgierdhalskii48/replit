# KancelariaInDB


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**location** | **str** |  | 
**specialization** | **str** |  | 
**id** | **int** |  | 

## Example

```python
from openapi_client.models.kancelaria_in_db import KancelariaInDB

# TODO update the JSON string below
json = "{}"
# create an instance of KancelariaInDB from a JSON string
kancelaria_in_db_instance = KancelariaInDB.from_json(json)
# print the JSON string representation of the object
print(KancelariaInDB.to_json())

# convert the object into a dict
kancelaria_in_db_dict = kancelaria_in_db_instance.to_dict()
# create an instance of KancelariaInDB from a dict
kancelaria_in_db_from_dict = KancelariaInDB.from_dict(kancelaria_in_db_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


