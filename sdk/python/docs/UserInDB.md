# UserInDB


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **str** |  | 
**id** | **int** |  | 
**is_active** | **bool** |  | [default to True]

## Example

```python
from openapi_client.models.user_in_db import UserInDB

# TODO update the JSON string below
json = "{}"
# create an instance of UserInDB from a JSON string
user_in_db_instance = UserInDB.from_json(json)
# print the JSON string representation of the object
print(UserInDB.to_json())

# convert the object into a dict
user_in_db_dict = user_in_db_instance.to_dict()
# create an instance of UserInDB from a dict
user_in_db_from_dict = UserInDB.from_dict(user_in_db_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


